import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const PACKAGE_LOCK_PATH = path.join(REPO_ROOT, "package-lock.json");
const DEPENDENCIES_MD_PATH = path.join(REPO_ROOT, "DEPENDENCIES.md");
const NODE_MODULES_PATH = path.join(REPO_ROOT, "node_modules");
const SUPPORTED_NODE_RANGE = "^20.19.0 || >=22.12.0";

const fail = (message) => {
  console.error(`Dependency check failed: ${message}`);
  process.exit(1);
};

const loadJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Unable to parse ${path.basename(filePath)}. ${error.message}`);
  }
};

const parseVersion = (version) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());

  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
};

const compareVersions = (left, right) => {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
};

const isSupportedNodeVersion = (rawVersion) => {
  const parsed = parseVersion(rawVersion);

  if (!parsed) {
    return false;
  }

  if (parsed.major === 20) {
    return compareVersions(parsed, { major: 20, minor: 19, patch: 0 }) >= 0;
  }

  if (parsed.major === 21) {
    return false;
  }

  if (parsed.major === 22) {
    return compareVersions(parsed, { major: 22, minor: 12, patch: 0 }) >= 0;
  }

  return parsed.major > 22;
};

const normalizePackageMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
};

const stringifyPackageMap = (value) =>
  JSON.stringify(normalizePackageMap(value), null, 2);

const ensureManifestDriftFree = (packageJson, packageLock) => {
  const lockRoot = packageLock?.packages?.[""];

  if (!lockRoot || typeof lockRoot !== "object") {
    fail("package-lock.json is missing the root package entry.");
  }

  const manifestGroups = [
    ["dependencies", normalizePackageMap(packageJson.dependencies)],
    ["devDependencies", normalizePackageMap(packageJson.devDependencies)],
  ];

  for (const [groupName, manifestMap] of manifestGroups) {
    const lockMap = normalizePackageMap(lockRoot[groupName]);

    if (stringifyPackageMap(manifestMap) !== stringifyPackageMap(lockMap)) {
      fail(
        `${groupName} in package.json do not match package-lock.json. Reconcile the manifests and rerun npm ci.`,
      );
    }
  }
};

const parseDependencyTable = (markdown, heading) => {
  const headingPattern = new RegExp(
    `## ${heading}\\r?\\n\\r?\\n\\| Package \\| Version \\| Purpose \\|\\r?\\n\\| --- \\| --- \\| --- \\|\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`,
  );
  const match = markdown.match(headingPattern);

  if (!match) {
    fail(`DEPENDENCIES.md is missing the "${heading}" table.`);
  }

  const lines = match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith("|"));

  const entries = {};

  for (const line of lines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2) {
      continue;
    }

    const packageName = cells[0].replace(/`/g, "");
    const version = cells[1].replace(/`/g, "");
    entries[packageName] = version;
  }

  return normalizePackageMap(entries);
};

const ensureDependenciesDocInSync = (packageJson, markdown) => {
  const runtimeTable = parseDependencyTable(markdown, "Runtime Dependencies");
  const devTable = parseDependencyTable(markdown, "Development Dependencies");
  const runtimeManifest = normalizePackageMap(packageJson.dependencies);
  const devManifest = normalizePackageMap(packageJson.devDependencies);

  if (stringifyPackageMap(runtimeTable) !== stringifyPackageMap(runtimeManifest)) {
    fail(
      "Runtime dependencies in DEPENDENCIES.md do not match package.json. Update the inventory document.",
    );
  }

  if (stringifyPackageMap(devTable) !== stringifyPackageMap(devManifest)) {
    fail(
      "Development dependencies in DEPENDENCIES.md do not match package.json. Update the inventory document.",
    );
  }
};

const isDirectoryLike = (dirent) => dirent.isDirectory() || dirent.isSymbolicLink();

const collectInstalledTopLevelPackages = () => {
  const packageNames = [];
  const entries = readdirSync(NODE_MODULES_PATH, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".bin" || entry.name === ".package-lock.json") {
      continue;
    }

    if (!isDirectoryLike(entry)) {
      continue;
    }

    if (entry.name.startsWith("@")) {
      const scopePath = path.join(NODE_MODULES_PATH, entry.name);
      const scopedEntries = readdirSync(scopePath, { withFileTypes: true });

      for (const scopedEntry of scopedEntries) {
        if (!isDirectoryLike(scopedEntry)) {
          continue;
        }

        packageNames.push(`${entry.name}/${scopedEntry.name}`);
      }

      continue;
    }

    packageNames.push(entry.name);
  }

  return packageNames.sort((left, right) => left.localeCompare(right));
};

const collectLockfileTopLevelPackages = (packageLock) =>
  Object.keys(packageLock?.packages ?? {})
    .filter((key) => key.startsWith("node_modules/"))
    .map((key) => key.slice("node_modules/".length))
    .filter((packageName) => !packageName.includes("/node_modules/"))
    .sort((left, right) => left.localeCompare(right));

const ensureInstalledTopLevelPackages = (packageJson, packageLock) => {
  const declaredPackages = [
    ...Object.keys(normalizePackageMap(packageJson.dependencies)),
    ...Object.keys(normalizePackageMap(packageJson.devDependencies)),
  ];
  const lockPackages = packageLock?.packages ?? {};
  const actualTopLevelPackages = collectInstalledTopLevelPackages();
  const actualTopLevelSet = new Set(actualTopLevelPackages);
  const expectedTopLevelSet = new Set(collectLockfileTopLevelPackages(packageLock));
  const extraneousPackages = actualTopLevelPackages.filter(
    (packageName) => !expectedTopLevelSet.has(packageName),
  );

  if (extraneousPackages.length > 0) {
    fail(
      `Found top-level packages that are not tracked by package-lock.json: ${extraneousPackages.join(", ")}. Repair the workspace with npm ci and rerun npm run check:deps.`,
    );
  }

  for (const packageName of declaredPackages) {
    const installedPackageJsonPath = path.join(
      NODE_MODULES_PATH,
      ...packageName.split("/"),
      "package.json",
    );
    const lockEntry = lockPackages[`node_modules/${packageName}`];

    if (!actualTopLevelSet.has(packageName) || !existsSync(installedPackageJsonPath)) {
      fail(`${packageName} is missing from node_modules. Run npm ci and rerun npm run check:deps.`);
    }

    if (!lockEntry || typeof lockEntry.version !== "string") {
      fail(`package-lock.json is missing the resolved top-level entry for ${packageName}.`);
    }

    const installedPackageJson = loadJson(installedPackageJsonPath);
    const installedVersion = installedPackageJson?.version;

    if (typeof installedVersion !== "string") {
      fail(`Installed package metadata for ${packageName} is missing a version field.`);
    }

    if (installedVersion !== lockEntry.version) {
      fail(
        `${packageName} is installed at ${installedVersion}, but package-lock.json expects ${lockEntry.version}. Repair the workspace with npm ci and rerun npm run check:deps.`,
      );
    }
  }
};

const packageJson = loadJson(PACKAGE_JSON_PATH);
const packageLock = loadJson(PACKAGE_LOCK_PATH);
const dependenciesMarkdown = readFileSync(DEPENDENCIES_MD_PATH, "utf8");
const currentNodeVersion = process.version;

if (!isSupportedNodeVersion(currentNodeVersion)) {
  fail(
    `Node ${currentNodeVersion} is unsupported. Install a compatible release that satisfies ${SUPPORTED_NODE_RANGE}.`,
  );
}

ensureManifestDriftFree(packageJson, packageLock);
ensureDependenciesDocInSync(packageJson, dependenciesMarkdown);

if (!existsSync(NODE_MODULES_PATH)) {
  fail("node_modules is missing. Run npm ci to install the exact dependencies from package-lock.json.");
}

ensureInstalledTopLevelPackages(packageJson, packageLock);

console.log(
  `Dependency check passed. Node ${currentNodeVersion} satisfies ${SUPPORTED_NODE_RANGE}, manifests are in sync, and declared top-level packages match package-lock.json.`,
);

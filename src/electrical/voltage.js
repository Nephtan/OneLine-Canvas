export const DEFAULT_MEDIUM_VOLTAGE = 34500;
export const DEFAULT_LOW_VOLTAGE = 480;

function trimTrailingZeros(value) {
  return value.replace(/\.?0+$/, "");
}

export function parseVoltageInput(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return null;
  }

  const directNumericValue = Number(trimmedValue.replace(/,/g, ""));

  if (Number.isFinite(directNumericValue) && directNumericValue > 0) {
    return Math.round(directNumericValue);
  }

  const extractedVoltages = extractVoltagesFromText(trimmedValue);
  return extractedVoltages.length > 0 ? extractedVoltages[0] : null;
}

export function extractVoltagesFromText(value) {
  if (typeof value !== "string") {
    return [];
  }

  const sanitizedValue = value.replace(/,/g, "");
  const unitMatches = Array.from(
    sanitizedValue.matchAll(/(\d+(?:\.\d+)?)\s*(kV|V)\b/gi)
  )
    .map((match) => {
      const magnitude = Number(match[1]);

      if (!Number.isFinite(magnitude) || magnitude <= 0) {
        return null;
      }

      return match[2].toUpperCase() === "KV"
        ? Math.round(magnitude * 1000)
        : Math.round(magnitude);
    })
    .filter((value) => value !== null);

  if (unitMatches.length > 0) {
    return unitMatches;
  }

  const bareNumericMatches = sanitizedValue.match(/\d+(?:\.\d+)?/g);

  if (!bareNumericMatches) {
    return [];
  }

  return bareNumericMatches
    .map((segment) => Number(segment))
    .filter((segment) => Number.isFinite(segment) && segment > 0)
    .map((segment) => Math.round(segment));
}

export function normalizeVoltageValue(value, fallbackValue) {
  const parsedValue = parseVoltageInput(value);
  return parsedValue ?? fallbackValue;
}

export function formatVoltageValue(value) {
  const normalizedValue = parseVoltageInput(value);

  if (normalizedValue === null) {
    return "--";
  }

  if (normalizedValue >= 1000) {
    return `${trimTrailingZeros((normalizedValue / 1000).toFixed(3))} kV`;
  }

  return `${normalizedValue} V`;
}

export function formatTransformerVoltage(primaryVoltage, secondaryVoltage) {
  return `${formatVoltageValue(primaryVoltage)} / ${formatVoltageValue(
    secondaryVoltage
  )}`;
}

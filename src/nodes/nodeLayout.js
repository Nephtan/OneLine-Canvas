export const NODE_SIZE_FAMILY = {
  STANDARD: "standard",
  SOURCE: "source",
  COMPLEX: "complex"
};

const NODE_SHELL_CLASS_BY_FAMILY = {
  [NODE_SIZE_FAMILY.STANDARD]: "relative flex w-[240px] min-h-[192px] shrink-0 flex-col",
  [NODE_SIZE_FAMILY.SOURCE]: "relative flex w-[240px] min-h-[240px] shrink-0 flex-col",
  [NODE_SIZE_FAMILY.COMPLEX]: "relative flex w-[288px] min-h-[288px] shrink-0 flex-col"
};

export function getNodeShellClassName(family) {
  return (
    NODE_SHELL_CLASS_BY_FAMILY[family] ??
    NODE_SHELL_CLASS_BY_FAMILY[NODE_SIZE_FAMILY.STANDARD]
  );
}

export const packageNameRegex =
  /\/node_modules\/((?:[^@][^/]+)|(?:@[^/]+\/[^/]+))/g;

export const extractPackageName = (path: string): string | null => {
  const pnpmSentinel = "/node_modules/.pnpm/";
  if (path.includes(pnpmSentinel)) {
    // go to the character immediately after the pnpm sentinel
    const startIndex = path.indexOf(pnpmSentinel) + pnpmSentinel.length;
    const endIndex = path.indexOf("/", startIndex);
    if (endIndex === -1) {
      throw new Error(
        "Invalid path format: no closing slash found after pnpm sentinel",
      );
    }
    return path.substring(startIndex, endIndex).replace("+", "/");
  }

  return path;
};

/**
 * Computes the relative path from one absolute path to another.
 *
 * @param from - The anchor directory (must be an absolute path).
 * @param to - The absolute path you want to relativize.
 * @returns A relative path from `from` to `to`.
 */
export function relativizePath(from: string, to: string): string {
  // Ensure both paths end with a slash if they're directories
  const fromURL = new URL(`file://${from.endsWith("/") ? from : `${from}/}`}`);
  const toURL = new URL(`file://${to}`);

  const fromParts = fromURL.pathname.split("/").filter(Boolean);
  const toParts = toURL.pathname.split("/").filter(Boolean);

  // Find where they diverge
  let i = 0;
  while (
    i < fromParts.length &&
    i < toParts.length &&
    fromParts[i] === toParts[i]
  ) {
    i++;
  }

  const up = fromParts.length - i;
  const down = toParts.slice(i).join("/");

  return `${"../".repeat(up)}${down}`;
}

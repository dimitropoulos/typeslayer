import {
  extractPackageName,
  type ResolvedType,
  relativizePath,
} from "@typeslayer/validate";

export const stripPackageJson = (path: string): string => {
  if (path.endsWith("/package.json")) {
    return path.slice(0, -"/package.json".length);
  }
  return path;
};

export const friendlyPath = (
  absolutePath: string | undefined,
  projectRoot: string | undefined,
  relativePaths: boolean | undefined,
) => {
  if (!absolutePath) {
    console.error("missing path", {
      fullPath: absolutePath,
      projectRoot,
      relativePaths,
    });
    return "[Missing Path]";
  }

  if (!relativePaths || !projectRoot) {
    return absolutePath;
  }

  // projectRoot is a file path (package.json), get its directory
  const projectDir = stripPackageJson(projectRoot);

  if (absolutePath.startsWith(`${projectDir}/`)) {
    // remove the project directory from the path and return relative path
    const relativePath = absolutePath.slice(projectDir.length + 1);
    return `./${relativePath}`;
  }
  if (absolutePath === projectDir) {
    return ".";
  }

  const packageName = extractPackageName(absolutePath);
  if (packageName && packageName !== absolutePath) {
    const splitVersionIndex = packageName.indexOf(
      "@",
      packageName.startsWith("@") ? 1 : 0,
    );
    if (splitVersionIndex === -1) {
      // no version found, just return the package name
      return packageName;
    }

    const withoutVersion = packageName.slice(0, splitVersionIndex);

    const locationOfWithoutVersion = absolutePath.lastIndexOf(withoutVersion);
    if (locationOfWithoutVersion === -1) {
      // the package name without version is not found in the absolute path
      return packageName;
    }
    const pathAfterPackageName = absolutePath.slice(
      locationOfWithoutVersion + withoutVersion.length,
    );
    return `${packageName}${pathAfterPackageName}`;
  }

  return relativizePath(projectRoot, absolutePath);
};

export const serverBaseUrl = "http://127.0.0.1:4765";

export const formatBytesSize = (bytes: number): string => {
  const kibibyte = 1024;
  if (bytes < kibibyte) {
    return `${bytes} B`;
  }

  const mebibyte = kibibyte * 1024;
  if (bytes < mebibyte) {
    const kib = Math.round(bytes / kibibyte);
    return `${kib} KiB`;
  }

  const gibibyte = mebibyte * 1024;
  if (bytes < gibibyte) {
    const mib = Math.round(bytes / mebibyte);
    return `${mib} MiB`;
  }

  const gib = Math.round(bytes / gibibyte);
  return `${gib} GiB`;
};

export const extractPath = (resolvedType: ResolvedType) => {
  if (resolvedType.firstDeclaration?.path) {
    return resolvedType.firstDeclaration.path;
  }
  if (resolvedType.referenceLocation?.path) {
    return resolvedType.referenceLocation.path;
  }
  if (resolvedType.destructuringPattern?.path) {
    return resolvedType.destructuringPattern.path;
  }
  return undefined;
};

export const stripAnsi = (text: string): string => {
  const esc = String.fromCharCode(27);
  return text.replace(new RegExp(`${esc}\\[[\\d;]*m`, "g"), "");
};

export const processTscExample = ({
  tscExample,
  projectRoot,
}: {
  tscExample: string | undefined;
  projectRoot: string | undefined;
}): string => {
  if (!tscExample) {
    return "<error>";
  }
  if (!projectRoot) {
    return tscExample;
  }

  // it might start with NODE_OPTIONS, so we need to extract that temporarily
  // it might look like:
  // - `NODE_OPTIONS='--max-old-space-size=4096'`
  // - `NODE_OPTIONS='--other-thing'`
  // - `NODE_OPTIONS='--max-old-space-size=4096 --other-thing'`
  const nodeOptions = tscExample.match(
    /^NODE_OPTIONS=(?:'[^']*'|--[^\s]+(?:\s--[^\s]+)*)/,
  );
  const nodeOptionsStr = nodeOptions?.[0] ?? "";
  const strippedTscExample = tscExample.replace(nodeOptionsStr, "");

  const example = strippedTscExample.replace(
    / --[^\s]+/g,
    match => ` \\\n  ${match}`,
  );
  console.log({ tscExample, nodeOptionsStr, strippedTscExample, example });
  return projectRoot
    ? [
        `${stripPackageJson(projectRoot)}`,
        `$ ${nodeOptionsStr ? `${nodeOptionsStr} ` : ""}${example}`,
      ].join("\n")
    : "<error>";
};

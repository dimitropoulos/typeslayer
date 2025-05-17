export const displayPath = (fullPath: string | undefined, cwd: string | undefined, simplifyPath: boolean) => {
  if (!fullPath) {
    console.error("missing path", { fullPath, cwd, simplifyPath });
    return "[Missing Path]";
  }  
  
  if (!simplifyPath || !cwd) {
    return fullPath;
  }
  return fullPath.replace(cwd, ".");
}
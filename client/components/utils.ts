import { useEffect, useState } from "react";

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

export const useStaticFile = (fileName: string) => {
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:3000/static/${fileName}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const text = await response.text();
        setData(text);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  })
  return data;
}

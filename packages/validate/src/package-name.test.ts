import { expect, test } from "vitest";
import { extractPackageName, relativizePath } from "./package-name";

test("extractPackageName", () => {
  const pnpmLodash =
    "/home/tr/src/github.com/mui/material-ui/node_modules/.pnpm/@types+lodash@4.17.17/node_modules/@types/lodash/common/common.d.ts:200:6";
  expect(extractPackageName(pnpmLodash)).toBe("@types/lodash@4.17.17");

  const pnpmTypeScript =
    "/home/tr/src/github.com/mui/material-ui/node_modules/.pnpm/typescript@5.8.3/node_modules/typescript/lib/lib.es5.d.ts:1322:17";
  expect(extractPackageName(pnpmTypeScript)).toBe("typescript@5.8.3");
});

test("relativizePath", () => {
  const base = "/home/tr/src/github.com/mui/material-ui/packages/material-ui/";
  const target =
    "/home/tr/src/github.com/mui/material-ui/packages/mui-system/src/useMediaQuery/useMediaQuery.ts";
  const expected = "../mui-system/src/useMediaQuery/useMediaQuery.ts";
  expect(relativizePath(base, target)).toBe(expected);
});

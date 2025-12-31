import type { PackageManager } from "@typeslayer/rust-types";
import { Bun, NPM, PNPM, Yarn } from "../assets/icons";

export const PackageManagerIcon = ({
  packageManager,
}: {
  packageManager: PackageManager;
}) => {
  switch (packageManager) {
    case "npm":
      return <NPM />;
    case "yarn":
      return <Yarn />;
    case "pnpm":
      return <PNPM />;
    case "bun":
      return <Bun />;
    default:
      throw new Error(`Unknown package manager: ${packageManager}`);
  }
};

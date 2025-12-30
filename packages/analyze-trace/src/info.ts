import type { SvgIconComponent } from "@mui/icons-material";
import CopyAll from "@mui/icons-material/CopyAll";
import Whatshot from "@mui/icons-material/Whatshot";

export const analyzeTraceInfo = {
  hotSpots: {
    title: "Hot Spots",
    description:
      "Files or paths where the TypeScript compiler spent the most cumulative time. Use these to target expensive type-checking work for refactors.",
    icon: Whatshot,
    route: "hot-spots",
  },
  duplicatePackages: {
    title: "Duplicate Packages",
    description:
      "Packages that appear multiple times in the bundle (different install paths / versions). Consolidate to reduce size & divergence.",
    icon: CopyAll,
    route: "duplicate-packages",
  },
} as const satisfies Record<
  string,
  {
    title: string;
    description: string;
    icon: SvgIconComponent;
    route: string;
  }
>;

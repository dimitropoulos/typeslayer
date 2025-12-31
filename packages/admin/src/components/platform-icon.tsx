import {
  Apple,
  EmojiEvents,
  HelpOutline,
  Microsoft,
} from "@mui/icons-material";
import { ArchLinux, Ubuntu } from "../assets/icons";

export const PlatformIcon = ({ platform }: { platform: string }) => {
  const lowercased = platform?.toLowerCase() ?? "";

  if (lowercased.includes("windows")) {
    return <Microsoft sx={{ fill: "#357EC7" }} />;
  }

  if (lowercased.includes("mac")) {
    return <Apple sx={{ fill: "gray" }} />;
  }

  if (lowercased.includes("ubuntu")) {
    return <Ubuntu />;
  }

  if (lowercased.includes("arch linux")) {
    return <ArchLinux />;
  }

  if (["linux"].some(distro => lowercased.includes(distro))) {
    return <EmojiEvents sx={{ fill: "#e95420" }} />;
  }

  return <HelpOutline />;
};

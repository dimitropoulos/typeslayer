import { Apple, HelpOutline, Microsoft } from "@mui/icons-material";
import {
  ArchLinux,
  CachyOs,
  EndeavourOS,
  Fedora,
  GuarudaLinux,
  LinuxMint,
  Manjaro,
  NixOS,
  Nobora,
  OpenSUSE,
  Ubuntu,
  Void,
} from "../assets/icons";

const extractTwoDigitsAfterMatch = (matchString: string, platform: string) => {
  const regex = new RegExp(`${matchString}(\\d{1,2})`, "i");
  const match = platform.match(regex);
  if (match?.[1]) {
    return match[1];
  }
  console.error("Could not extract version from platform string:", platform);
  return "Unknown";
};

const platforms = {
  windows: (platform: string) => {
    const match = "windows ";
    const version = extractTwoDigitsAfterMatch(match, platform);
    const color = "#087CD6";
    return {
      match,
      operatingSystem: "Windows",
      version,
      name: `Windows ${version}`,
      color,
      icon: <Microsoft sx={{ fill: color }} />,
    };
  },
  mac: (platform: string) => {
    const match = "mac os ";
    const version = extractTwoDigitsAfterMatch(match, platform);
    const color = "#999999";
    const productName = {
      "11": "Big Sur",
      "12": "Monterey",
      "13": "Ventura",
      "14": "Sonoma",
      "15": "Sequoia",
      "26": "Tahoe",
    }[version];

    if (!productName) {
      console.error("Unknown Mac version:", platform, version);
    }

    return {
      match,
      operatingSystem: "Mac",
      version,
      name: `MacOS ${productName ?? "Unknown"}`,
      color,
      icon: <Apple sx={{ fill: color }} />,
    };
  },
  ubuntu: (platform: string) => {
    const regex = /ubuntu (\d{1,2}\.\d{1,2})/i;
    const match = platform.match(regex);
    let version: string;
    if (match?.[1]) {
      version = match[1];

      // replace .4 with .04 for LTS versions
      if (version.endsWith(".4")) {
        version = version.replace(".4", ".04");
      }
    } else {
      console.error(
        "Could not extract Ubuntu version from platform string:",
        platform,
      );
      version = "Unknown";
    }

    return {
      match: "ubuntu 2",
      operatingSystem: "Linux",
      version,
      name: `Ubuntu ${version}`,
      color: "#E95420",
      icon: <Ubuntu />,
    };
  },
  archlinux: (_platform: string) => ({
    match: "arch linux ",
    operatingSystem: "Linux",
    version: "Rolling",
    name: "Arch Linux",
    color: "#1793D1",
    icon: <ArchLinux />,
  }),
  manjaro: (platform: string) => {
    const match = "manjaro ";
    return {
      match,
      operatingSystem: "Linux", // Arch variant
      version: extractTwoDigitsAfterMatch(match, platform),
      name: "Manjaro",
      color: "#35BFA4",
      icon: <Manjaro />,
    };
  },
  fedora: (platform: string) => {
    const match = "fedora ";
    return {
      match,
      operatingSystem: "Linux",
      version: extractTwoDigitsAfterMatch(match, platform),
      name: "Fedora",
      color: "#3C6EB4",
      icon: <Fedora />,
    };
  },
  cachyOs: (_platform: string) => ({
    match: "cachyos ",
    operatingSystem: "Linux", // Arch variant
    version: "Rolling",
    name: "Cachy OS",
    color: "#00CCFF",
    icon: <CachyOs />,
  }),
  garuda: (_platform: string) => ({
    match: "garuda linux ",
    operatingSystem: "Linux", // Arch variant
    version: "Rolling",
    name: "Garuda Linux",
    color: "#CBA6F7",
    icon: <GuarudaLinux />,
  }),
  linuxMint: (platform: string) => {
    const match = "linux mint ";
    return {
      match,
      operatingSystem: "Linux",
      version: extractTwoDigitsAfterMatch(match, platform),
      name: "Linux Mint",
      color: "#87CF5E",
      icon: <LinuxMint />,
    };
  },
  openSUSE: (_platform: string) => ({
    match: "opensuse ",
    operatingSystem: "Linux",
    version: "Rolling",
    name: "OpenSUSE",
    color: "#73BA25",
    icon: <OpenSUSE />,
  }),
  endeavourOs: (_platform: string) => ({
    match: "endeavouros ",
    operatingSystem: "Linux",
    version: "Rolling",
    name: "EndeavourOS",
    color: "#8345C1",
    icon: <EndeavourOS />,
  }),
  nixOs: (platform: string) => ({
    match: "nixos ",
    operatingSystem: "Linux",
    version: platform.match(/(\d+\.\d+)/)?.[1] ?? "Unknown",
    name: "NixOS",
    color: "#5277C3",
    icon: <NixOS />,
  }),
  void: (_platform: string) => ({
    match: "void linux ",
    operatingSystem: "Linux",
    version: "Rolling",
    name: "Void",
    color: "#ABC2AB",
    icon: <Void />,
  }),
  nobara: (platform: string) => ({
    match: "nobara linux ",
    operatingSystem: "Linux",
    version: extractTwoDigitsAfterMatch("nobara linux ", platform),
    name: "Nobara",
    color: "#7C3AED",
    icon: <Nobora />,
  }),
  unknown: (_platform: string) => {
    const color = "#CC0000";
    return {
      match: "",
      operatingSystem: "Unknown",
      version: "Unknown",
      name: "Unknown",
      color,
      icon: <HelpOutline sx={{ fill: color }} />,
    };
  },
} satisfies Record<string, Platform>;

type Platform = (platform: string) => {
  match: string;
  operatingSystem: string;
  version: string;
  name: string;
  color: string;
  icon: React.ReactNode;
};

export const detectPlatform = (platform: string) => {
  const lowercased = platform?.toLowerCase() ?? "";
  for (const [key, value] of Object.entries(platforms)) {
    const p = platforms[key as keyof typeof platforms](platform);
    if (lowercased.includes(p.match)) {
      return value(platform);
    }
  }
  console.log("Unknown platform:", platform);
  return platforms.unknown(platform);
};

export const PlatformIcon = ({ platform }: { platform: string }) => {
  return detectPlatform(platform).icon;
};

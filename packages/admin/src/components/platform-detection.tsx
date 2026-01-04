import { Apple, HelpOutline, Microsoft } from "@mui/icons-material";
import {
  ArchLinux,
  CachyOs,
  Fedora,
  GuarudaLinux,
  LinuxMint,
  Manjaro,
  OpenSUSE,
  Ubuntu,
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
    const version = extractTwoDigitsAfterMatch("windows ", platform);
    const color = "#087CD6";
    return {
      operatingSystem: "Windows",
      version,
      name: `Windows ${version}`,
      color,
      icon: <Microsoft sx={{ fill: color }} />,
    };
  },
  mac: (platform: string) => {
    const version = extractTwoDigitsAfterMatch("mac os ", platform);
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
      operatingSystem: "Linux",
      version,
      name: `Ubuntu ${version}`,
      color: "#E95420",
      icon: <Ubuntu />,
    };
  },
  archlinux: (_platform: string) => ({
    operatingSystem: "Linux",
    version: "Rolling",
    name: "Arch Linux",
    color: "#1793D1",
    icon: <ArchLinux />,
  }),
  manjaro: (platform: string) => ({
    operatingSystem: "Linux", // Arch variant
    version: extractTwoDigitsAfterMatch("manjaro ", platform),
    name: "Manjaro",
    color: "#35BFA4",
    icon: <Manjaro />,
  }),
  fedora: (platform: string) => ({
    operatingSystem: "Linux",
    version: extractTwoDigitsAfterMatch("fedora ", platform),
    name: "Fedora",
    color: "#3C6EB4",
    icon: <Fedora />,
  }),
  cachyOs: (_platform: string) => ({
    operatingSystem: "Linux", // Arch variant
    version: "Rolling",
    name: "Cachy OS",
    color: "#00CCFF",
    icon: <CachyOs />,
  }),
  garuda: (_platform: string) => ({
    operatingSystem: "Linux", // Arch variant
    version: "Rolling",
    name: "Garuda Linux",
    color: "#CBA6F7",
    icon: <GuarudaLinux />,
  }),
  linuxMint: (platform: string) => ({
    operatingSystem: "Linux",
    version: extractTwoDigitsAfterMatch("linux mint ", platform),
    name: "Linux Mint",
    color: "#87CF5E",
    icon: <LinuxMint />,
  }),
  openSUSE: (_platform: string) => ({
    operatingSystem: "Linux",
    version: "Rolling",
    name: "openSUSE",
    color: "#73BA25",
    icon: <OpenSUSE />,
  }),
  unknown: (_platform: string) => {
    const color = "#CC0000";
    return {
      operatingSystem: "Unknown",
      version: "Unknown",
      name: "Unknown",
      color,
      icon: <HelpOutline sx={{ fill: color }} />,
    };
  },
} satisfies Record<
  string,
  (platform: string) => {
    operatingSystem: string;
    version: string;
    name: string;
    color: string;
    icon: React.ReactNode;
  }
>;

export const detectPlatform = (platform: string) => {
  const lowercased = platform?.toLowerCase() ?? "";

  if (lowercased.includes("windows ")) {
    return platforms.windows(platform);
  }
  if (lowercased.includes("mac os ")) {
    return platforms.mac(platform);
  }
  if (lowercased.includes("ubuntu 2")) {
    return platforms.ubuntu(platform);
  }
  if (lowercased.includes("arch linux ")) {
    return platforms.archlinux(platform);
  }
  if (lowercased.includes("manjaro ")) {
    return platforms.manjaro(platform);
  }
  if (lowercased.includes("cachyos ")) {
    return platforms.cachyOs(platform);
  }
  if (lowercased.includes("fedora ")) {
    return platforms.fedora(platform);
  }
  if (lowercased.includes("garuda linux ")) {
    return platforms.garuda(platform);
  }
  if (lowercased.includes("linux mint ")) {
    return platforms.linuxMint(platform);
  }
  if (lowercased.includes("opensuse ")) {
    return platforms.openSUSE(platform);
  }

  console.log("Unknown platform:", platform);
  return platforms.unknown(platform);
};

export const PlatformIcon = ({ platform }: { platform: string }) => {
  return detectPlatform(platform).icon;
};

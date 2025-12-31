import { Apple, HelpOutline, Microsoft } from "@mui/icons-material";
import { ArchLinux, Ubuntu } from "../assets/icons";

const colors = {
  windows: "#087CD6",
  mac: "#999999",
  ubuntu: "#E95420",
  archlinux: "#1793D1",
  unknown: "#CC0000",
};

const icons = {
  apple: <Apple sx={{ fill: colors.mac }} />,
  windows: <Microsoft sx={{ fill: colors.windows }} />,
  ubuntu: <Ubuntu />,
  archlinux: <ArchLinux />,
};

const platforms = {
  windows10: {
    operatingSystem: "Windows",
    version: "10",
    name: "Windows 10",
    color: colors.windows,
    icon: icons.windows,
  },
  windows11: {
    operatingSystem: "Windows",
    version: "11",
    name: "Windows 11",
    color: colors.windows,
    icon: icons.windows,
  },
  macTahoe: {
    operatingSystem: "Mac",
    version: "26",
    name: "MacOS Tahoe",
    color: colors.mac,
    icon: icons.apple,
  },
  macSequoia: {
    operatingSystem: "Mac",
    version: "15",
    name: "MacOS Sequoia",
    color: colors.mac,
    icon: icons.apple,
  },
  macSonoma: {
    operatingSystem: "Mac",
    version: "14",
    name: "MacOS Sonoma",
    color: colors.mac,
    icon: icons.apple,
  },
  macVentura: {
    operatingSystem: "Mac",
    version: "13",
    name: "MacOS Ventura",
    color: colors.mac,
    icon: icons.apple,
  },
  macMonterey: {
    operatingSystem: "Mac",
    version: "12",
    name: "MacOS Monterey",
    color: colors.mac,
    icon: icons.apple,
  },
  macBigSur: {
    operatingSystem: "Mac",
    version: "11",
    name: "MacOS BigSur",
    color: colors.mac,
    icon: icons.apple,
  },
  ubuntuNoble: {
    operatingSystem: "Linux",
    version: "24.04",
    name: "Ubuntu 24.04",
    color: colors.ubuntu,
    icon: icons.ubuntu,
  },
  ubuntuOcular: {
    operatingSystem: "Linux",
    version: "24.10",
    name: "Ubuntu 24.10",
    color: colors.ubuntu,
    icon: icons.ubuntu,
  },
  ubuntuPlucky: {
    operatingSystem: "Linux",
    version: "25.04",
    name: "Ubuntu 25.04",
    color: colors.ubuntu,
    icon: icons.ubuntu,
  },
  ubuntuQuesting: {
    operatingSystem: "Linux",
    version: "25.10",
    name: "Ubuntu 25.10",
    color: colors.ubuntu,
    icon: icons.ubuntu,
  },
  archlinux: {
    operatingSystem: "Linux",
    version: "Rolling",
    name: "Arch Linux",
    color: colors.archlinux,
    icon: icons.archlinux,
  },
  unknown: {
    operatingSystem: "Unknown",
    version: "Unknown",
    name: "Unknown",
    color: colors.unknown,
    icon: <HelpOutline />,
  },
} as const;

export const detectPlatform = (platform: string) => {
  const lowercased = platform?.toLowerCase() ?? "";

  if (lowercased.includes("windows 10")) {
    return platforms.windows10;
  }
  if (lowercased.includes("windows 11")) {
    return platforms.windows11;
  }
  if (lowercased.includes("mac os 26")) {
    return platforms.macTahoe;
  }
  if (lowercased.includes("mac os 15")) {
    return platforms.macSequoia;
  }
  if (lowercased.includes("mac os 14")) {
    return platforms.macSonoma;
  }
  if (lowercased.includes("mac os 13")) {
    return platforms.macVentura;
  }
  if (lowercased.includes("mac os 12")) {
    return platforms.macMonterey;
  }
  if (lowercased.includes("mac os 11")) {
    return platforms.macBigSur;
  }
  if (lowercased.includes("ubuntu 24.4")) {
    return platforms.ubuntuNoble;
  }
  if (lowercased.includes("ubuntu 24.10")) {
    return platforms.ubuntuOcular;
  }
  if (lowercased.includes("ubuntu 25.4")) {
    return platforms.ubuntuPlucky;
  }
  if (lowercased.includes("ubuntu 25.10")) {
    return platforms.ubuntuQuesting;
  }
  if (lowercased.includes("arch linux")) {
    return platforms.archlinux;
  }
  console.log("Unknown platform:", platform);
  return platforms.unknown;
};

export const PlatformIcon = ({ platform }: { platform: string }) => {
  return detectPlatform(platform).icon;
};

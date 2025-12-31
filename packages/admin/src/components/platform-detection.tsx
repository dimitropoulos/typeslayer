import { Apple, HelpOutline, Microsoft } from "@mui/icons-material";
import { ArchLinux, Ubuntu } from "../assets/icons";

const icons = {
  apple: <Apple sx={{ fill: "gray" }} />,
  windows: <Microsoft sx={{ fill: "#357EC7" }} />,
  ubuntu: <Ubuntu />,
  archlinux: <ArchLinux />,
};

const platforms = {
  windows10: {
    operatingSystem: "Windows",
    version: "10",
    name: "Windows 10",
    icon: icons.windows,
  },
  windows11: {
    operatingSystem: "Windows",
    version: "11",
    name: "Windows 11",
    icon: icons.windows,
  },
  macTahoe: {
    operatingSystem: "Mac",
    version: "26",
    name: "MacOS Tahoe",
    icon: icons.apple,
  },
  macSequoia: {
    operatingSystem: "Mac",
    version: "15",
    name: "MacOS Sequoia",
    icon: icons.apple,
  },
  macSonoma: {
    operatingSystem: "Mac",
    version: "14",
    name: "MacOS Sonoma",
    icon: icons.apple,
  },
  macVentura: {
    operatingSystem: "Mac",
    version: "13",
    name: "MacOS Ventura",
    icon: icons.apple,
  },
  macMonterey: {
    operatingSystem: "Mac",
    version: "12",
    name: "MacOS Monterey",
    icon: icons.apple,
  },
  macBigSur: {
    operatingSystem: "Mac",
    version: "11",
    name: "MacOS BigSur",
    icon: icons.apple,
  },
  ubuntuNoble: {
    operatingSystem: "Linux",
    version: "24.04",
    name: "Ubuntu 24.04",
    icon: icons.ubuntu,
  },
  ubuntuOcular: {
    operatingSystem: "Linux",
    version: "24.10",
    name: "Ubuntu 24.10",
    icon: icons.ubuntu,
  },
  ubuntuPlucky: {
    operatingSystem: "Linux",
    version: "25.04",
    name: "Ubuntu 25.04",
    icon: icons.ubuntu,
  },
  ubuntuQuesting: {
    operatingSystem: "Linux",
    version: "25.10",
    name: "Ubuntu 25.10",
    icon: icons.ubuntu,
  },
  archlinux: {
    operatingSystem: "Linux",
    version: "Rolling",
    name: "Arch Linux",
    icon: icons.archlinux,
  },
  unknown: {
    operatingSystem: "Unknown",
    version: "Unknown",
    name: "Unknown",
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

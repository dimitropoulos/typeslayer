import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useGenerateAll } from "../hooks/tauri-hooks";

interface LogoFadeContextType {
  startGeneratingAll: () => Promise<void>;
  shouldShowLogoFade: boolean;
  setShouldShowLogoFade: (value: boolean) => void;
}

const LogoFadeContext = createContext<LogoFadeContextType | null>(null);

export const useLogoFade = () => {
  const context = useContext(LogoFadeContext);
  if (!context) {
    throw new Error("useLogoFade must be used within LogoFadeProvider");
  }
  return context;
};

export const useLogoFadeState = () => {
  const [shouldShowLogoFade, setShouldShowLogoFade] = useState(false);
  const { mutateAsync: onGenerateAll } = useGenerateAll();

  const startGeneratingAll = useCallback(async () => {
    await onGenerateAll();
    setShouldShowLogoFade(true);
  }, [onGenerateAll]);

  return { shouldShowLogoFade, startGeneratingAll, setShouldShowLogoFade };
};

export const LogoFadeProvider = ({ children }: { children: ReactNode }) => {
  const { startGeneratingAll, shouldShowLogoFade, setShouldShowLogoFade } =
    useLogoFadeState();
  return (
    <LogoFadeContext.Provider
      value={{ startGeneratingAll, shouldShowLogoFade, setShouldShowLogoFade }}
    >
      {children}
    </LogoFadeContext.Provider>
  );
};

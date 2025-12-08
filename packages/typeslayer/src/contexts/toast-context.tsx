import { Alert, Button, Snackbar } from "@mui/material";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface ToastData {
  message: string;
  severity?: "success" | "error" | "warning" | "info";
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void | Promise<void>;
  };
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: ToastData) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = useCallback((toastData: ToastData) => {
    setToast(toastData);
    setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast?.duration ?? 6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ zIndex: 1500 }}
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? "info"}
          sx={{ width: "100%", zIndex: 1500 }}
          action={
            toast?.action ? (
              <Button
                color="inherit"
                size="small"
                startIcon={toast.action.icon}
                onClick={toast.action.onClick}
              >
                {toast.action.label}
              </Button>
            ) : undefined
          }
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

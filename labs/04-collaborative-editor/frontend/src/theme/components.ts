import type { Components, Theme } from "@mui/material/styles";

export const componentsOverrides: Components<Omit<Theme, "components">> = {
  MuiCssBaseline: {
    styleOverrides: {
      "*": {
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      },
      html: {
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        height: "100%",
        width: "100%",
      },
      body: {
        height: "100%",
        width: "100%",
      },
      "#root": {
        height: "100%",
        width: "100%",
      },
      "code, pre, kbd, samp": {
        fontFamily: "var(--font-mono)",
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: "10px",
        padding: "8px 18px",
        boxShadow: "none",
        textTransform: "none",
        fontWeight: 600,
        transition: "background-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "0px 4px 12px rgba(37, 99, 235, 0.18)",
        },
      },
      contained: {
        fontWeight: 600,
        boxShadow: "0px 4px 10px rgba(37, 99, 235, 0.15)",
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
        borderRadius: "16px",
        boxShadow:
          "0px 10px 20px -3px rgba(0, 0, 0, 0.04), 0px 4px 6px -2px rgba(0, 0, 0, 0.02)",
        border: "1px solid var(--border-color)",
      },
      outlined: {
        borderColor: "var(--border-color)",
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: "16px",
        boxShadow:
          "0px 10px 20px -3px rgba(0, 0, 0, 0.04), 0px 4px 6px -2px rgba(0, 0, 0, 0.02)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        // O efeito de elevação no hover aplica-se SOMENTE a cartões interativos/clicáveis
        "&.MuiCard-interactive, &:has(.MuiCardActionArea-root), &[role='button']":
          {
            cursor: "pointer",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0px 20px 27px 0px rgba(0, 0, 0, 0.08)",
            },
          },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        borderRadius: "9999px",
        height: "24px",
        fontSize: "0.75rem",
        padding: "0 4px",
      },
      sizeSmall: {
        height: "20px",
        fontSize: "0.68rem",
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: "small",
      variant: "outlined",
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: "10px",
        fontSize: "0.8125rem",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        "&.Mui-focused": {
          boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: "12px 16px",
        fontSize: "0.8125rem",
        borderBottom: "1px solid var(--border-color)",
      },
      head: {
        fontWeight: 600,
        textTransform: "uppercase",
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        color: "var(--text-secondary)",
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: "1px solid var(--border-color)",
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "none",
        borderBottom: "1px solid var(--border-color)",
      },
    },
  },
};

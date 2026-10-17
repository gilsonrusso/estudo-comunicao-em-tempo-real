import type { TypographyVariantsOptions } from "@mui/material/styles";
import { tailwindFonts } from "./tokens";

export const typography: TypographyVariantsOptions = {
  fontFamily: tailwindFonts.sans,
  fontSize: 13,
  htmlFontSize: 16,
  h1: {
    fontFamily: tailwindFonts.sans,
    fontSize: "1.85rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.035em",
  },
  h2: {
    fontFamily: tailwindFonts.sans,
    fontSize: "1.45rem",
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.03em",
  },
  h3: {
    fontFamily: tailwindFonts.sans,
    fontSize: "1.22rem",
    fontWeight: 650,
    lineHeight: 1.3,
    letterSpacing: "-0.025em",
  },
  h4: {
    fontFamily: tailwindFonts.sans,
    fontSize: "1.05rem",
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: "-0.015em",
  },
  h5: {
    fontFamily: tailwindFonts.sans,
    fontSize: "0.95rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontFamily: tailwindFonts.sans,
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subtitle1: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  subtitle2: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: "0.8125rem",
    lineHeight: 1.5,
  },
  body2: {
    fontSize: "0.75rem",
    lineHeight: 1.45,
  },
  button: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    textTransform: "none",
    letterSpacing: "0.01em",
  },
  caption: {
    fontSize: "0.7rem",
    lineHeight: 1.3,
  },
  overline: {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
};

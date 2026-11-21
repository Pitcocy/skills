import React from "react";
import { STYLE } from "../style";
import type { FontRole, Style } from "./types";

export const StyleContext = React.createContext<Style>(STYLE);

export const useStyle = () => React.useContext(StyleContext);

export const font = (role: FontRole): React.CSSProperties => ({
  fontFamily: role.family,
  fontWeight: role.weight,
  textTransform: role.uppercase ? "uppercase" : undefined,
  letterSpacing: role.letterSpacing,
});

export const cardLook = (style: Style, shadowColor?: string): React.CSSProperties => ({
  background: style.colors.surface,
  borderRadius: style.card.radius,
  border: style.card.border > 0 ? `${style.card.border}px solid ${style.colors.ink}` : undefined,
  boxShadow:
    style.card.shadow === "hard"
      ? `10px 10px 0 ${shadowColor ?? style.colors.ink}`
      : style.card.shadow === "soft"
        ? "0 14px 40px rgba(15, 23, 42, 0.12)"
        : undefined,
});

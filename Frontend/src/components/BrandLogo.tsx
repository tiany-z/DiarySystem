import React from "react";

interface BrandLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  withShadow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 34,
  className = "",
  style = {},
  withShadow = true,
}) => {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <img
      src="/logo.svg"
      alt="拾光手记 Logo"
      className={`brand-logo-img ${className}`.trim()}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: "inline-block",
        borderRadius: typeof size === "number" ? `${Math.round(size * 0.28)}px` : "10px",
        boxShadow: withShadow ? "0 4px 12px rgba(91, 123, 141, 0.3)" : undefined,
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
      draggable={false}
    />
  );
};

export default BrandLogo;

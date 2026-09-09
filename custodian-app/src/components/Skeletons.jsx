import React from "react";
import { S, COLORS } from "../styles";

export function SkeletonRow({ width = "100%", height = 16, style }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius: 4,
        background: "rgba(255, 255, 255, 0.05)",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ height = 120, style }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        height,
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonRow width="45%" height={16} />
        <SkeletonRow width="20%" height={14} />
      </div>
      <SkeletonRow width="80%" height={12} />
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <SkeletonRow width="30%" height={24} />
        <SkeletonRow width="25%" height={24} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, minWidth = 260, height = 130 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: 14,
        width: "100%",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}

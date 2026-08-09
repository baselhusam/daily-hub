type BrandIconMarkProps = {
  tileSize: number;
  gap: number;
  radius: number;
  cornerRadius?: number;
  background?: string;
  tileColor?: string;
};

export function BrandIconMark({
  tileSize,
  gap,
  radius,
  cornerRadius,
  background = "#333333",
  tileColor = "white",
}: BrandIconMarkProps) {
  const gridSize = tileSize * 2 + gap;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        borderRadius: cornerRadius,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: gridSize,
          height: gridSize,
          gap,
        }}
      >
        {[0.95, 0.35, 0.35, 0.95].map((opacity, index) => (
          <div
            key={index}
            style={{
              width: tileSize,
              height: tileSize,
              borderRadius: radius,
              background: tileColor,
              opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}

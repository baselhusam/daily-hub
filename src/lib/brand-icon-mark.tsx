type BrandIconMarkProps = {
  size?: number;
  inverse?: boolean;
  background?: string;
};

export function BrandIconMark({
  size = 28,
  inverse = false,
  background = "#FFFFFF",
}: BrandIconMarkProps) {
  const tile = inverse ? "#FFFFFF" : "#37352F";
  const check = inverse ? "#37352F" : "#FFFFFF";
  const halo = inverse ? "#37352F" : "#FFFFFF";
  const dot = inverse ? "#6BAEE9" : "#2383E2";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        style={{ display: "flex" }}
      >
        <rect x="2.5" y="5.5" width="30" height="30" rx="8.5" fill={tile} />
        <path
          d="M10.5 21.2l5 5 10.5-11"
          stroke={check}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="32" cy="8" r="6" fill={halo} />
        <circle cx="32" cy="8" r="4" fill={dot} />
      </svg>
    </div>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  entityTintStyles,
  getEntityInitials,
  resolveEntityColor,
} from "@/lib/entity-colors";

type EntityAvatarProps = {
  name: string;
  color?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: "md" | "lg";
};

export function EntityAvatar({
  name,
  color,
  logoUrl,
  size = 30,
  className,
  rounded = "md",
}: EntityAvatarProps) {
  const radius = rounded === "lg" ? "rounded-[10px]" : "rounded-md";
  const tint = entityTintStyles(color);
  const initials = getEntityInitials(name);

  if (logoUrl) {
    return (
      <span
        className={cn(
          "relative inline-grid shrink-0 place-items-center overflow-hidden border border-border",
          radius,
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center border text-[11px] font-semibold tabular-nums",
        radius,
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: tint.backgroundColor,
        borderColor: tint.borderColor,
        color: resolveEntityColor(color),
        fontSize: size < 32 ? 11 : 12,
      }}
    >
      {initials}
    </span>
  );
}

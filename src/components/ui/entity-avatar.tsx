import Image from "next/image";
import { Inbox } from "lucide-react";
import { getIcon } from "@/lib/icons";
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
  iconKey?: string | null;
  size?: number;
  className?: string;
  rounded?: "md" | "lg";
};

export function EntityAvatar({
  name,
  color,
  logoUrl,
  iconKey,
  size = 30,
  className,
  rounded = "md",
}: EntityAvatarProps) {
  const radius = rounded === "lg" ? "rounded-[10px]" : "rounded-md";
  const tint = entityTintStyles(color);
  const initials = getEntityInitials(name);
  const Icon = iconKey ? getIcon(iconKey) : null;
  const iconSize = Math.max(10, Math.round(size * 0.48));

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
        "inline-grid shrink-0 place-items-center border font-semibold tabular-nums",
        radius,
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: tint.backgroundColor,
        borderColor: tint.borderColor,
        color: resolveEntityColor(color),
        fontSize: size < 22 ? 9 : size < 32 ? 11 : 12,
      }}
    >
      {Icon ? (
        <Icon style={{ width: iconSize, height: iconSize }} aria-hidden />
      ) : (
        initials
      )}
    </span>
  );
}

export function InboxAvatar({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const iconSize = Math.max(10, Math.round(size * 0.48));
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-md border border-border bg-border text-muted-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Inbox style={{ width: iconSize, height: iconSize }} aria-hidden />
    </span>
  );
}

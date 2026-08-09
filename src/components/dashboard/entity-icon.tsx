import Image from "next/image";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type EntityIconProps = {
  iconKey: string;
  logoUrl?: string | null;
  className?: string;
  size?: number;
};

export function EntityIcon({
  iconKey,
  logoUrl,
  className,
  size = 16,
}: EntityIconProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-sm object-cover", className)}
        unoptimized
      />
    );
  }

  const Icon = getIcon(iconKey);
  return <Icon className={cn("shrink-0", className)} size={size} />;
}

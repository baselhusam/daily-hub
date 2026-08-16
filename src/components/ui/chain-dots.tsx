import { cn } from "@/lib/utils";

type ChainDot = {
  color: string;
};

type ChainDotsProps = {
  dots: ChainDot[];
  className?: string;
  size?: "sm" | "md";
};

export function ChainDots({ dots, className, size = "sm" }: ChainDotsProps) {
  return (
    <div className={cn("flex gap-[3px]", className)}>
      {dots.map((dot, index) => (
        <span
          key={index}
          className={cn(
            "flex-1 rounded-[2px]",
            size === "sm" ? "h-1.5" : "h-4"
          )}
          style={{ backgroundColor: dot.color }}
        />
      ))}
    </div>
  );
}

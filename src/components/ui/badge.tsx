import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.08] text-white/80 border-white/[0.08]",
        secondary:
          "bg-white/[0.03] text-white/40 border-white/[0.03]",
        destructive:
          "bg-red-500/10 text-red-500 border-red-500/20",
        outline: "text-white/40 border-white/[0.06] bg-transparent",
        success:
          "bg-green-500/10 text-green-500 border-green-500/20",
        warning:
          "bg-amber-500/10 text-amber-500 border-amber-500/20",
        info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
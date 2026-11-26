import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-white",
        secondary: "border-slate-200 bg-slate-100 text-slate-800",
        published: "border-emerald-200 bg-emerald-50 text-emerald-800",
        draft: "border-amber-200 bg-amber-50 text-amber-800",
        archived: "border-slate-200 bg-slate-100 text-slate-600",
        destructive: "border-red-200 bg-red-50 text-red-700",
        accent: "border-orange-200 bg-orange-50 text-orange-800",
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

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };

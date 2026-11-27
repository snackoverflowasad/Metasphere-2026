import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[84px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

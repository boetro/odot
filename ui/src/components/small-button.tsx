import { forwardRef } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export const SmallButton = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }
>(({ children, onClick, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn(
        "h-6 text-xs rounded-sm gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
});

SmallButton.displayName = "SmallButton";

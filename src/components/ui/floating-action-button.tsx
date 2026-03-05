import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FloatingActionButton({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      size="icon"
      {...props}
      className={cn(
        "fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-2xl active:scale-95",
        className,
      )}
    >
      {children}
    </Button>
  );
}

import { cn } from "@/lib/utils";

type SubheaderProps = {
  children: React.ReactNode;
  className?: string;
};

/** Recipe detail section title (instructions, ingredients, notes, nutrition, …). */
export function Subheader({ children, className }: SubheaderProps) {
  return (
    <h3 className={cn("type-h2 text-foreground", className)}>{children}</h3>
  );
}

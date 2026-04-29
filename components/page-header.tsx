import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  className?: string;
};

export function PageHeader({ title, className }: PageHeaderProps) {
  // Keep one shared heading structure for page-level titles.
  return (
    <div className={cn("flex items-center", className)}>
      <h1 className="type-h1">{title}</h1>
    </div>
  );
}

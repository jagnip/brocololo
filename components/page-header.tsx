type PageHeaderProps = {
  title: string;
  className?: string;
};

export function PageHeader({ title, className }: PageHeaderProps) {
  // Keep one shared heading structure for page-level titles.
  return (
    <div className={["flex items-center pb-4", className].filter(Boolean).join(" ")}>
      <h1 className="type-h1">{title}</h1>
    </div>
  );
}

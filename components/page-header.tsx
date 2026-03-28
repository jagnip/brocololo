type PageHeaderProps = {
  title: string;
  className?: string;
};

export function PageHeader({ title, className }: PageHeaderProps) {
  // Keep one shared heading structure for page-level titles.
  return (
    <div className={["flex items-center ", className].filter(Boolean).join(" ")}>
      <h1 className="text-page-title font-semibold">{title}</h1>
    </div>
  );
}

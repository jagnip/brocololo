type PageHeaderProps = {
  title: string;
};

export function PageHeader({ title}: PageHeaderProps) {
  // Keep one shared heading structure for page-level titles.
  return (
    <div className="flex items-center pb-4">
      <h1 className="type-h1">{title}</h1>
    </div>
  );
}

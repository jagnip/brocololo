// Marketing pages — full-width layout without app sidebar or top bar.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-svh flex-col">{children}</div>;
}

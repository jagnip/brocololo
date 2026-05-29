// Minimal layout for sign-in — no app sidebar or top bar.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      {children}
    </div>
  );
}

type LayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}
    </>
  );
}

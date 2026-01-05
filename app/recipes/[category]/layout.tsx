import RecipeHeader from "@/components/recipe-header";

type LayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ category: string }>;
};

export default async function Layout({ children, modal, params }: LayoutProps) {
  const { category: activeCategoryRaw } = await params;
  const activeCategory = activeCategoryRaw.toLowerCase();

  return (
    <>
      <RecipeHeader activeCategory={activeCategory} />
      {children}
      {modal}
    </>
  );
}

import RecipeHeader from "@/components/recipe-header";

type PageProps = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default async function Layout({ params, children, modal }: PageProps) {
  const { category: activeCategory } = await params;

  return (
    <>
      <RecipeHeader activeCategory={activeCategory} />
      {children}
      {modal}
    </>
  );
}

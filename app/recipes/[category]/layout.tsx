import RecipeHeader from "@/components/recipe-header";
import { categoriesData } from "@/lib/categories-data";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default async function Layout({ params, children, modal }: PageProps) {
  const { category: activeCategoryRaw } = await params;

  // console.log("activeCategory: ", activeCategory);

  //This gonna block Suspense streaming until the categories are loaded
  //Use use() from React from Clinet Server Insight lesson
  const categories = categoriesData;
  const activeCategory = activeCategoryRaw.toLowerCase();

  if (activeCategory !== "all") {
    const categoryExists = categoriesData.some(
      (cat) => cat.slug === activeCategory
    );

    if (!categoryExists) {
      notFound();
    }
  }

  return (
    <>
      <RecipeHeader categories={categories} />

      {children}
      {modal}
    </>
  );
}

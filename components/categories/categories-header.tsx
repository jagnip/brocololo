import type { CategoryType } from "@/types/category";
import { CategoryNavLink } from "./category-nav-link";

type CategoriesHeaderProps = {
  categories: CategoryType[];
};

export default function CategoriesHeader({
  categories,
}: CategoriesHeaderProps) {
  return (
    <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <CategoryNavLink href="/">All</CategoryNavLink>
      {categories.map((category: CategoryType) => (
        <CategoryNavLink key={category.id} href={`/category/${category.id}`}>
          {category.name}
        </CategoryNavLink>
      ))}
    </header>
  );
}

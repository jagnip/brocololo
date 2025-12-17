import type { CategoryType } from "@/types/category";
import Link from "next/link";

type CategoriesHeaderProps = {
  categories: CategoryType[];
};

export default function CategoriesHeader({ categories }: CategoriesHeaderProps) {
  return (
    <header className="flex gap-1 sticky top-0 z-10 bg-background border-b">
      {categories.map((category: CategoryType) => (
        <div key={category.id}>
          <Link href="/category">{category.name}</Link>
        </div>
      ))}
    </header>
  );
}

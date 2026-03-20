"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ROUTES } from "@/lib/constants";

export function AppTopbar() {
  const pathname = usePathname();
  const isRecipesPage = pathname.startsWith(ROUTES.recipes);

  return (
    <header className="flex h-14 items-center border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="lg:hidden" />
      {isRecipesPage ? (
        <Button asChild size="sm" className="ml-auto">
          <Link href={ROUTES.recipeCreate}>
            Create recipe
          </Link>
        </Button>
      ) : null}
    </header>
  );
}

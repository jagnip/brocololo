import Link from "next/link";
import {
  Apple,
  CookingPot,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

const features = [
  {
    icon: CookingPot,
    title: "Recipes",
    description: "Save and browse your collection — ingredients, steps, and notes in one place.",
  },
  {
    icon: UtensilsCrossed,
    title: "Meal plan",
    description: "Plan breakfasts, lunches, and dinners across the week without starting from scratch.",
  },
  {
    icon: Apple,
    title: "Ingredients",
    description: "Manage your pantry and keep ingredient details consistent across recipes.",
  },
  {
    icon: ShoppingCart,
    title: "Groceries",
    description: "Build shopping lists from your meal plan so you buy what you actually need.",
  },
] as const;

export function LandingPage() {
  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={ROUTES.home} className="flex items-center gap-2 type-h2 text-foreground">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-rose-sm">
              <CookingPot className="size-4" />
            </span>
            NomNom
          </Link>
          <Button variant="outline" asChild>
            <Link href={ROUTES.signIn}>Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <Badge variant="secondary" className="mb-4">
            Meal planning
          </Badge>
          <h1 className="type-h1 max-w-2xl">
            Plan meals. Shop smarter. Cook with confidence.
          </h1>
          <p className="type-body mt-4 max-w-xl text-muted-foreground">
            NomNom brings your recipes, weekly meal plan, ingredient library,
            and grocery lists together — so dinner decisions take less mental
            energy.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href={ROUTES.signUp}>Sign up</Link>
          </Button>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="type-h2 text-center">Everything in one kitchen app</h2>
            <p className="type-body mx-auto mt-2 max-w-lg text-center text-muted-foreground">
              From saving a recipe to checking off groceries — built for how you
              actually cook at home.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => (
                <li key={title}>
                  <Card className="card-interactive h-full">
                    <CardHeader>
                      <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-sm">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="type-h2">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t px-4 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
            <p className="type-body text-muted-foreground">
              Ready to organize your kitchen?
            </p>
            <Button size="lg" asChild>
              <Link href={ROUTES.signUp}>Sign up free</Link>
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}

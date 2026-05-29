import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { ROUTES } from "@/lib/constants";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect(ROUTES.recipes);
  }

  return <LandingPage />;
}

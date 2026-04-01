import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default function LogIndexPage() {
  redirect(ROUTES.recipes);
}

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** Index forwards to the “current groceries plan” resolver (same idea as `/plan`). */
export default function GroceriesIndexPage() {
  redirect(ROUTES.groceriesCurrent);
}

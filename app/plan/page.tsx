import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
export default function PlanIndexPage() {
  // Keep legacy /plan links working by forwarding to the "current plan" resolver.
  redirect(ROUTES.planCurrent);
}

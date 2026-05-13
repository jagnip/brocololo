import PlannerFormContainer from "@/components/planner/planner-form-container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROUTES } from "@/lib/constants";

export default function CreatePlanPage() {
  return (
    <div className="page-container">
      <Breadcrumbs
        items={[
          {
            label: "Meal plan",
            href: ROUTES.planCurrent,
          },
          { label: "Create plan" },
        ]}
        className="pb-4"
      />
      <PlannerFormContainer />
    </div>
  );
}

import PlannerFormContainer from "@/components/planner/planner-form-container";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROUTES } from "@/lib/constants";

export default function CreatePlanPage() {
  return (
    <div className="page-container">
      <PageHeader title="Create plan" className="pb-2" />
      <Breadcrumbs
        items={[
          {
            label: "Planner",
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

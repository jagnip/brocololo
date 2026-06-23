"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { GroceriesShareDialog } from "@/components/groceries/groceries-share-dialog";
import { useGroceriesTopbarState } from "@/components/groceries/groceries-topbar-state-context";
import { TopbarConfigController } from "@/components/topbar-config";
import type { BreadcrumbSelectOption } from "@/components/ui/breadcrumb-select";
import { ROUTES } from "@/lib/constants";

type GroceriesTopbarConfigProps = {
  planId: string;
  /** Same label as plan switcher / groceries list (e.g. "Jan 3 - Jan 9"). */
  planDateRangeLabel: string;
  planOptions: BreadcrumbSelectOption[];
  /** True when the persisted list exists and has at least one item (matches prior “Edit groceries” gate). */
  canEdit: boolean;
};

/** Registers groceries top bar: plan switcher on view breadcrumb + Share + overflow actions. */
export function GroceriesTopbarConfig({
  planId,
  planDateRangeLabel,
  planOptions,
  canEdit,
}: GroceriesTopbarConfigProps) {
  const pathname = usePathname();
  const isEditRoute = pathname.endsWith("/edit");
  const [shareOpen, setShareOpen] = useState(false);
  const { state } = useGroceriesTopbarState();

  const config = useMemo(() => {
    const actions = isEditRoute
      ? []
      : canEdit
        ? [
            {
              id: "share-groceries",
              label: "Share",
              onClick: () => setShareOpen(true),
              variant: "outline" as const,
              size: "default" as const,
            },
          ]
        : [];

    const overflowMenu =
      isEditRoute || !canEdit
        ? undefined
        : {
            ariaLabel: "Groceries actions",
            items: [
              {
                id: "edit-groceries",
                label: "Edit groceries",
                href: ROUTES.groceriesEdit(planId),
              },
              {
                id: "edit-supermarket-layout",
                label: "Edit supermarket layout",
                disabled: state.isEditSupermarketLayoutDisabled,
                onSelect: state.onEditSupermarketLayout,
              },
              {
                id: "create-supermarket-layout",
                label: "Create supermarket layout",
                onSelect: state.onCreateSupermarketLayout,
              },
              {
                id: "delete-groceries-list",
                label: "Delete groceries list",
                destructive: true,
                disabled: state.isDeleteDisabled || state.isDeleting,
                onSelect: state.onDeleteGroceriesList,
              },
            ],
          };

    const breadcrumbs = isEditRoute
      ? [
          { label: "Groceries", href: ROUTES.groceriesCurrent },
          {
            label: planDateRangeLabel,
            href: ROUTES.groceriesView(planId),
          },
          { label: "Edit groceries" },
        ]
      : [
          { label: "Groceries", href: ROUTES.groceriesCurrent },
          {
            label: planDateRangeLabel,
            select: {
              kind: "groceries" as const,
              options: planOptions,
              currentId: planId,
            },
          },
        ];

    return {
      breadcrumbs,
      actions,
      overflowMenu,
    };
  }, [
    canEdit,
    isEditRoute,
    planDateRangeLabel,
    planId,
    planOptions,
    state.isDeleteDisabled,
    state.isDeleting,
    state.isEditSupermarketLayoutDisabled,
    state.onCreateSupermarketLayout,
    state.onDeleteGroceriesList,
    state.onEditSupermarketLayout,
  ]);

  return (
    <>
      <TopbarConfigController config={config} />
      {canEdit && !isEditRoute ? (
        <GroceriesShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          planId={planId}
        />
      ) : null}
    </>
  );
}

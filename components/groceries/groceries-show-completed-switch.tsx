"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GroceriesShowCompletedSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** Tab-style toggle for completed rows; matches meal plan Manage / Track. `checked` = show. */
export function GroceriesShowCompletedSwitch({
  checked,
  onCheckedChange,
}: GroceriesShowCompletedSwitchProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-sm text-foreground">Completed</span>
      <Tabs
        value={checked ? "show" : "hide"}
        onValueChange={(value) => {
          if (value === "show" || value === "hide") {
            onCheckedChange(value === "show");
          }
        }}
        className="w-fit shrink-0"
      >
        <TabsList className="h-10 gap-[2px] shadow-xs">
          <TabsTrigger value="show">Show</TabsTrigger>
          <TabsTrigger value="hide">Hide</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

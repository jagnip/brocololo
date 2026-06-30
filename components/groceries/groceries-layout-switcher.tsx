"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GroceriesLayoutSwitcherPreset = {
  id: string;
  name: string;
  isBuiltIn: boolean;
};

type GroceriesLayoutSwitcherProps = {
  presets: GroceriesLayoutSwitcherPreset[];
  activePresetId: string | null;
  onPresetChange: (presetId: string) => void;
  onAddLayout?: () => void;
  disabled?: boolean;
  /** When false, no preset appears selected if `activePresetId` is null (e.g. new-layout draft). */
  fallbackToFirstPreset?: boolean;
};

/** Show in-page switcher only when the user has at least one custom layout. */
export function shouldShowLayoutSwitcher(
  presets: GroceriesLayoutSwitcherPreset[],
) {
  return presets.some((preset) => !preset.isBuiltIn);
}

function getLayoutPresetLabel(preset: GroceriesLayoutSwitcherPreset) {
  return preset.isBuiltIn ? "Default" : preset.name;
}

/** Dropdown for switching supermarket layout presets. */
export function GroceriesLayoutSwitcher({
  presets,
  activePresetId,
  onPresetChange,
  onAddLayout,
  disabled = false,
  fallbackToFirstPreset = true,
}: GroceriesLayoutSwitcherProps) {
  const safeActiveId = fallbackToFirstPreset
    ? (activePresetId ?? presets[0]?.id ?? null)
    : activePresetId;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        value={safeActiveId ?? undefined}
        onValueChange={onPresetChange}
        disabled={disabled || presets.length === 0}
        allowInlineClear={false}
      >
        <SelectTrigger
          className="w-full min-w-0 sm:w-44"
          aria-label="Supermarket layout"
        >
          <SelectValue placeholder="Select layout" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {getLayoutPresetLabel(preset)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onAddLayout ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Add supermarket layout"
          disabled={disabled}
          onClick={onAddLayout}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

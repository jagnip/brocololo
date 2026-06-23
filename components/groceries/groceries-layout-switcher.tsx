"use client";

import { Plus } from "lucide-react";
import {
  SegmentedFilterButton,
  SegmentedFilterGroup,
} from "@/components/ui/segmented-filter-button";
import { Button } from "@/components/ui/button";

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

function getLayoutPresetLabel(preset: GroceriesLayoutSwitcherPreset) {
  return preset.isBuiltIn ? "Default layout" : preset.name;
}

/** In-page button group for switching supermarket layout presets. */
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
    <SegmentedFilterGroup
      aria-label="Supermarket layout"
      className="max-sm:w-full"
    >
      {presets.map((preset) => {
        const isSelected = preset.id === safeActiveId;
        return (
          <SegmentedFilterButton
            key={preset.id}
            selected={isSelected}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onPresetChange(preset.id)}
          >
            {getLayoutPresetLabel(preset)}
          </SegmentedFilterButton>
        );
      })}
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
    </SegmentedFilterGroup>
  );
}

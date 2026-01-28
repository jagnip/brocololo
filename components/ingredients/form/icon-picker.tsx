"use client";

import * as React from "react";
import { IngredientIcon } from "@/components/ingredient-icon";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";

type IconPickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
};

export function iconLabel(fileName: string) {
  // Keep persisted icon values untouched, but show user-friendly labels in the picker.
  return fileName.replace(/\.svg$/i, "").replace(/-/g, " ");
}

export function buildIconPickerOptions(
  options: string[],
): SearchableSelectOption[] {
  return options.map((iconFile) => ({
    value: iconFile,
    label: iconLabel(iconFile),
    searchText: iconFile,
    icon: iconFile,
  }));
}

export function IconPicker({ value, onChange, options }: IconPickerProps) {
  const iconOptions = React.useMemo<SearchableSelectOption[]>(
    () => buildIconPickerOptions(options),
    [options],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Live preview helps validate the selected icon quickly. */}
        <IngredientIcon icon={value} name={value ?? "fallback"} size={24} />

        <div className="w-48">
          <SearchableSelect
            options={iconOptions}
            value={value}
            onValueChange={onChange}
            placeholder="Select icon..."
            searchPlaceholder="Search icons..."
            emptyLabel="No icon found."
            allowClear
            clearLabel="Clear icon"
            renderIcon={(option) => (
              <IngredientIcon
                icon={option.icon ?? option.value}
                name={option.label}
                size={18}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

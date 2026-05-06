"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GroceriesLayoutPresetOption = {
  id: string;
  name: string;
};

type GroceriesLayoutSelectorProps = {
  presets: GroceriesLayoutPresetOption[];
  value: string | null;
  onValueChange: (presetId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
};

export function GroceriesLayoutSelector({
  presets,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select layout",
  triggerClassName,
}: GroceriesLayoutSelectorProps) {
  return (
    <Select value={value ?? undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={triggerClassName ?? "w-[180px]"} aria-label="Layout preset">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="end">
        {presets.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

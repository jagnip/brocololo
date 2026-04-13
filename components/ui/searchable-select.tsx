"use client";

import * as React from "react";
import { Check, ChevronDownIcon, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
  icon?: string | null;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string | null | undefined;
  onValueChange: (next: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  onCreateOption?: (searchTerm: string) => void;
  createOptionLabel?: (searchTerm: string) => string;
  renderIcon?: (option: SearchableSelectOption) => React.ReactNode;
  triggerIcon?: React.ReactNode;
  size?: "default" | "sm";
  className?: string;
};

// Keep selection lookup testable outside the component rendering layer.
export function getSelectedOption(
  options: SearchableSelectOption[],
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  return options.find((option) => option.value === value) ?? null;
}

// Keep command value composition centralized so search behavior stays consistent.
export function getCommandItemValue(option: SearchableSelectOption) {
  return `${option.label} ${option.searchText ?? ""}`.trim();
}

// Keep clear-action visibility logic explicit and testable.
export function shouldShowClearAction(params: {
  allowClear: boolean;
  value: string | null | undefined;
}) {
  return Boolean(params.allowClear && params.value);
}

export function shouldShowInlineClearButton(params: {
  disabled: boolean;
  showClearAction: boolean;
}) {
  return Boolean(!params.disabled && params.showClearAction);
}

export function shouldRenderSearchableSelectIcon(params: {
  option: SearchableSelectOption | null;
  hasRenderIcon: boolean;
}) {
  return Boolean(params.option && params.hasRenderIcon);
}

// Keep create-option visibility deterministic and testable for selector UX.
export function shouldShowCreateOption(params: {
  options: SearchableSelectOption[];
  searchTerm: string;
}) {
  const normalizedSearch = params.searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return false;
  }

  return !params.options.some(
    (option) => option.label.trim().toLowerCase() === normalizedSearch,
  );
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
  allowClear = true,
  clearLabel = "Clear selection",
  onCreateOption,
  createOptionLabel = (searchTerm) => `Create "${searchTerm}"`,
  renderIcon,
  triggerIcon,
  size = "default",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const popoverContentRef = React.useRef<HTMLDivElement | null>(null);

  const selectedOption = getSelectedOption(options, value);
  const showClearAction = shouldShowClearAction({ allowClear, value });
  const showInlineClearButton = shouldShowInlineClearButton({
    disabled,
    showClearAction,
  });
  const trimmedSearchValue = searchValue.trim();
  const showCreateAction = Boolean(
    onCreateOption &&
      shouldShowCreateOption({
        options,
        searchTerm: trimmedSearchValue,
      }),
  );

  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
      return;
    }

    // Focus the cmdk input after popover content is mounted and painted.
    const raf = requestAnimationFrame(() => {
      const input =
        popoverContentRef.current?.querySelector<HTMLInputElement>(
          '[data-slot="command-input"]',
        ) ??
        null;
      input?.focus();
      input?.select();
    });

    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          // Mirror Input/Button API: allow a compact trigger via size="default".
          size={size}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            // Keep trigger horizontal padding aligned with Input/Select defaults.
            "w-full justify-between px-3",
            !selectedOption && "text-muted-foreground",
            className,
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {shouldRenderSearchableSelectIcon({
              option: selectedOption,
              hasRenderIcon: Boolean(renderIcon),
            }) ? (
              <span className="shrink-0">{renderIcon?.(selectedOption!)}</span>
            ) : null}
            <span className={cn("truncate", !selectedOption && "font-normal")}>
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <span className="ml-2 inline-flex items-center gap-1 shrink-0">
            {showInlineClearButton ? (
              <span
                role="button"
                aria-label={clearLabel}
                className="inline-flex cursor-pointer items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                onPointerDown={(event) => {
                  // Keep inline clear from toggling popover open/close.
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                {/* Match clear icon sizing with the standard Select component. */}
                <X className="size-3.5" />
              </span>
            ) : null}
            {/* Match icon tone with standard Select trigger affordance. */}
            {triggerIcon ?? (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        ref={popoverContentRef}
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {showCreateAction ? (
                <CommandItem
                  value={`__create_option__ ${trimmedSearchValue}`}
                  onSelect={() => {
                    onCreateOption?.(trimmedSearchValue);
                    setOpen(false);
                  }}
                >
                  {createOptionLabel(trimmedSearchValue)}
                </CommandItem>
              ) : null}

              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={getCommandItemValue(option)}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderIcon ? <span className="mr-2 shrink-0">{renderIcon(option)}</span> : null}
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

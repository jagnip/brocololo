"use client";

import * as React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { GripVertical, X } from "lucide-react";
import { IngredientType } from "@/types/ingredient";
import {
  RecipeIngredientGroupInputType,
  RecipeIngredientInputType,
} from "@/lib/validations/recipe";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { IngredientIcon } from "@/components/ingredient-icon";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import {
  getDefaultUnitIdForIngredient as resolveDefaultUnitIdForIngredient,
  getFallbackUnitIdFromConversions,
} from "@/lib/ingredients/default-unit";

type IngredientSelectorProps = {
  ingredients: IngredientType[];
  groups: RecipeIngredientGroupInputType[];
  value: RecipeIngredientInputType[];
  onGroupsChange: (value: RecipeIngredientGroupInputType[]) => void;
  onChange: (value: RecipeIngredientInputType[]) => void;
  onCreateIngredientRequested?: (params: {
    rowIndex: number;
    initialName: string;
  }) => void;
  onEditIngredientRequested?: (ingredientId: string) => void;
};

// Keep row layout tokens centralized so primary/secondary line UX stays consistent.
export const INGREDIENT_ROW_LAYOUT_CLASSES = {
  rowContainer: "rounded-md border p-2 space-y-2",
  primaryLine: "flex flex-wrap items-center gap-2 lg:flex-nowrap",
  secondaryLine: "flex flex-wrap items-center gap-2",
  // Bigger handle improves drag start reliability on mouse/touch.
  dragHandle: "h-8 w-8 shrink-0 touch-none cursor-grab active:cursor-grabbing",
  amountInput: "w-28 shrink-0",
  unitTrigger: "w-32 shrink-0",
  ingredientContainer: "flex-1 basis-full lg:basis-auto min-w-[320px]",
  additionalInfoInput: "flex-1 min-w-[200px]",
  utilityButton: "shrink-0",
  secondaryRemoveButton: "ml-auto shrink-0",
} as const;

const UNGROUPED_LANE_KEY = "__ungrouped__";

export function buildClearIngredientPatch(): Pick<
  RecipeIngredientInputType,
  "ingredientId" | "unitId" | "amount"
> {
  return {
    ingredientId: "",
    unitId: null,
    amount: null,
  };
}

function normalizePosition(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function toLaneKey(groupTempKey: string | null | undefined) {
  return groupTempKey ?? UNGROUPED_LANE_KEY;
}

function getNextNutritionTarget(
  current: RecipeIngredientInputType["nutritionTarget"] | null | undefined,
  clicked: "PRIMARY_ONLY" | "SECONDARY_ONLY",
): RecipeIngredientInputType["nutritionTarget"] {
  // Clicking an active button resets row to shared (BOTH).
  if (current === clicked) {
    return "BOTH";
  }
  return clicked;
}

function normalizeGroupPositions(groups: RecipeIngredientGroupInputType[]) {
  return [...groups]
    .sort(
      (a, b) => normalizePosition(a.position) - normalizePosition(b.position),
    )
    .map((group, index) => ({
      ...group,
      position: index,
    }));
}

export function normalizeGroupedIngredients(input: {
  ingredients: RecipeIngredientInputType[];
  groups: RecipeIngredientGroupInputType[];
}) {
  const groups = normalizeGroupPositions(input.groups);

  const indexedIngredients = input.ingredients.map((ingredient, index) => ({
    ingredient: {
      ...ingredient,
      groupTempKey: ingredient.groupTempKey ?? null,
      position: normalizePosition(ingredient.position ?? index),
    },
    index,
  }));

  const groupedByLane = new Map<string, Array<(typeof indexedIngredients)[number]>>();
  for (const row of indexedIngredients) {
    const laneKey = toLaneKey(row.ingredient.groupTempKey);
    const rows = groupedByLane.get(laneKey) ?? [];
    rows.push(row);
    groupedByLane.set(laneKey, rows);
  }

  const laneOrder = [
    UNGROUPED_LANE_KEY,
    ...groups.map((group) => group.tempGroupKey),
  ];
  const normalizedIngredients: RecipeIngredientInputType[] = [];
  for (const laneKey of laneOrder) {
    const rows = (groupedByLane.get(laneKey) ?? [])
      .sort(
        (a, b) =>
          normalizePosition(a.ingredient.position) -
            normalizePosition(b.ingredient.position) || a.index - b.index,
      )
      .map((row) => row.ingredient);

    rows.forEach((row, position) => {
      normalizedIngredients.push({
        ...row,
        groupTempKey: laneKey === UNGROUPED_LANE_KEY ? null : laneKey,
        position,
      });
    });
  }

  return {
    groups,
    ingredients: normalizedIngredients,
  };
}

export function moveIngredientToPosition(input: {
  ingredients: RecipeIngredientInputType[];
  groups: RecipeIngredientGroupInputType[];
  ingredientTempKey: string;
  targetGroupTempKey: string | null;
  targetPosition: number;
}) {
  const normalized = normalizeGroupedIngredients({
    ingredients: input.ingredients,
    groups: input.groups,
  });
  const rowsByLane = new Map<string, RecipeIngredientInputType[]>();
  const laneOrder = [
    UNGROUPED_LANE_KEY,
    ...normalized.groups.map((group) => group.tempGroupKey),
  ];
  for (const lane of laneOrder) {
    rowsByLane.set(
      lane,
      normalized.ingredients.filter(
        (row) => toLaneKey(row.groupTempKey) === lane,
      ),
    );
  }

  let sourceLane = UNGROUPED_LANE_KEY;
  let sourceIndex = -1;
  for (const lane of laneOrder) {
    const rows = rowsByLane.get(lane) ?? [];
    const index = rows.findIndex(
      (row) => row.tempIngredientKey === input.ingredientTempKey,
    );
    if (index >= 0) {
      sourceLane = lane;
      sourceIndex = index;
      break;
    }
  }
  if (sourceIndex === -1) {
    return normalized;
  }

  const sourceRows = rowsByLane.get(sourceLane) ?? [];
  const [moved] = sourceRows.splice(sourceIndex, 1);
  rowsByLane.set(sourceLane, sourceRows);

  const targetLane = toLaneKey(input.targetGroupTempKey);
  const targetRows = rowsByLane.get(targetLane) ?? [];
  let nextTargetPosition = input.targetPosition;
  if (sourceLane === targetLane && input.targetPosition > sourceIndex) {
    // Adjust for the removed source row when moving down inside the same lane.
    nextTargetPosition -= 1;
  }
  const maxInsertIndex = targetRows.length;
  const insertIndex = Math.min(Math.max(0, nextTargetPosition), maxInsertIndex);
  targetRows.splice(insertIndex, 0, moved);
  rowsByLane.set(targetLane, targetRows);

  const ingredients: RecipeIngredientInputType[] = [];
  for (const lane of laneOrder) {
    const rows = rowsByLane.get(lane) ?? [];
    rows.forEach((row, position) => {
      ingredients.push({
        ...row,
        groupTempKey: lane === UNGROUPED_LANE_KEY ? null : lane,
        position,
      });
    });
  }

  return {
    groups: normalized.groups,
    ingredients,
  };
}

export function moveLaneToPosition(input: {
  groups: RecipeIngredientGroupInputType[];
  laneKey: string;
  targetIndex: number;
}) {
  const normalizedGroups = normalizeGroupPositions(input.groups);
  const currentLaneOrder = [
    UNGROUPED_LANE_KEY,
    ...normalizedGroups.map((group) => group.tempGroupKey),
  ];
  if (!currentLaneOrder.includes(input.laneKey)) {
    return {
      groups: normalizedGroups,
      laneOrder: currentLaneOrder,
    };
  }

  const withoutMoved = currentLaneOrder.filter((key) => key !== input.laneKey);
  const boundedTargetIndex = Math.min(
    Math.max(0, input.targetIndex),
    withoutMoved.length,
  );
  withoutMoved.splice(boundedTargetIndex, 0, input.laneKey);

  const groupByKey = new Map(
    normalizedGroups.map((group) => [group.tempGroupKey, group]),
  );
  const reorderedGroups = withoutMoved
    .filter((key) => key !== UNGROUPED_LANE_KEY)
    .map((key, index) => ({
      ...groupByKey.get(key)!,
      position: index,
    }));

  return {
    groups: reorderedGroups,
    laneOrder: withoutMoved,
  };
}

export function removeIngredientGroup(input: {
  ingredients: RecipeIngredientInputType[];
  groups: RecipeIngredientGroupInputType[];
  groupTempKey: string;
}) {
  const nextGroups = input.groups.filter(
    (group) => group.tempGroupKey !== input.groupTempKey,
  );
  // Group deletion is destructive by design: remove group and its rows.
  const movedIngredients = input.ingredients.filter(
    (ingredient) => ingredient.groupTempKey !== input.groupTempKey,
  );
  return normalizeGroupedIngredients({
    ingredients: movedIngredients,
    groups: nextGroups,
  });
}

export function IngredientSelector({
  ingredients,
  groups,
  value,
  onGroupsChange,
  onChange,
  onCreateIngredientRequested,
  onEditIngredientRequested,
}: IngredientSelectorProps) {
  const AUTO_SCROLL_EDGE_THRESHOLD_PX = 96;
  const AUTO_SCROLL_MAX_STEP_PX = 18;
  const [draggingIngredientKey, setDraggingIngredientKey] = React.useState<string | null>(
    null,
  );
  const [draggingLaneKey, setDraggingLaneKey] = React.useState<string | null>(null);
  const [activeIngredientDropSlot, setActiveIngredientDropSlot] = React.useState<string | null>(
    null,
  );
  const [activeLaneDropIndex, setActiveLaneDropIndex] = React.useState<number | null>(null);
  const dragPointerYRef = React.useRef<number | null>(null);
  const autoScrollFrameRef = React.useRef<number | null>(null);
  const isDraggingRef = React.useRef(false);
  // Keep option transformation memoized for smoother typing in cmdk.
  const ingredientOptions = React.useMemo<SearchableSelectOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.name,
        icon: ingredient.icon,
      })),
    [ingredients],
  );

  const normalizedGroups = React.useMemo(
    () => normalizeGroupPositions(groups),
    [groups],
  );
  const canonicalLaneOrder = React.useMemo(
    () => [UNGROUPED_LANE_KEY, ...normalizedGroups.map((group) => group.tempGroupKey)],
    [normalizedGroups],
  );
  const [laneOrder, setLaneOrder] = React.useState<string[]>(canonicalLaneOrder);

  const normalizedValue = React.useMemo(
    () =>
      normalizeGroupedIngredients({
        ingredients: value,
        groups: normalizedGroups,
      }).ingredients,
    [normalizedGroups, value],
  );

  React.useEffect(() => {
    setLaneOrder((previous) => {
      const allowed = new Set(canonicalLaneOrder);
      const kept = previous.filter((key) => allowed.has(key));
      for (const key of canonicalLaneOrder) {
        if (!kept.includes(key)) {
          kept.push(key);
        }
      }
      if (
        kept.length === previous.length &&
        kept.every((key, index) => key === previous[index])
      ) {
        return previous;
      }
      return kept;
    });
  }, [canonicalLaneOrder]);

  const getLaneRows = React.useCallback(
    (groupTempKey: string | null) =>
      normalizedValue
        .filter((row) => (row.groupTempKey ?? null) === groupTempKey)
        .sort(
          (a, b) =>
            normalizePosition(a.position) - normalizePosition(b.position),
        ),
    [normalizedValue],
  );

  const stopAutoScroll = React.useCallback(() => {
    if (autoScrollFrameRef.current != null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    dragPointerYRef.current = null;
  }, []);

  const runAutoScrollFrame = React.useCallback(() => {
    if (!isDraggingRef.current) {
      stopAutoScroll();
      return;
    }
    const pointerY = dragPointerYRef.current;
    if (pointerY == null) {
      autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScrollFrame);
      return;
    }
    let deltaY = 0;
    // Auto-scroll viewport near top/bottom edges so long drags are possible.
    if (pointerY <= AUTO_SCROLL_EDGE_THRESHOLD_PX) {
      const intensity =
        (AUTO_SCROLL_EDGE_THRESHOLD_PX - pointerY) / AUTO_SCROLL_EDGE_THRESHOLD_PX;
      deltaY = -Math.ceil(Math.max(1, intensity * AUTO_SCROLL_MAX_STEP_PX));
    } else if (
      pointerY >=
      window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX
    ) {
      const intensity =
        (pointerY - (window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX)) /
        AUTO_SCROLL_EDGE_THRESHOLD_PX;
      deltaY = Math.ceil(Math.max(1, intensity * AUTO_SCROLL_MAX_STEP_PX));
    }
    if (deltaY !== 0) {
      window.scrollBy(0, deltaY);
    }
    autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScrollFrame);
  }, [stopAutoScroll]);

  const trackDragPointer = React.useCallback(
    (clientY: number) => {
      dragPointerYRef.current = clientY;
      if (autoScrollFrameRef.current == null) {
        autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScrollFrame);
      }
    },
    [runAutoScrollFrame],
  );

  React.useEffect(() => {
    isDraggingRef.current = Boolean(draggingIngredientKey || draggingLaneKey);
    if (!isDraggingRef.current) {
      stopAutoScroll();
      return;
    }
    const handleWindowDragOver = (event: DragEvent) => {
      trackDragPointer(event.clientY);
    };
    // Track pointer globally during native DnD so viewport scroll works beyond local slots.
    window.addEventListener("dragover", handleWindowDragOver);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      stopAutoScroll();
    };
  }, [draggingIngredientKey, draggingLaneKey, stopAutoScroll, trackDragPointer]);

  const syncIngredients = React.useCallback(
    (nextIngredients: RecipeIngredientInputType[]) => {
      const normalized = normalizeGroupedIngredients({
        ingredients: nextIngredients,
        groups: normalizedGroups,
      });
      onChange(normalized.ingredients);
    },
    [normalizedGroups, onChange],
  );

  const syncGroupsAndIngredients = React.useCallback(
    (
      nextGroups: RecipeIngredientGroupInputType[],
      nextIngredients: RecipeIngredientInputType[],
    ) => {
      const normalized = normalizeGroupedIngredients({
        ingredients: nextIngredients,
        groups: nextGroups,
      });
      onGroupsChange(normalized.groups);
      onChange(normalized.ingredients);
    },
    [onChange, onGroupsChange],
  );

  const addIngredient = (groupTempKey: string | null) => {
    const lanePosition = normalizedValue.filter(
      (row) => (row.groupTempKey ?? null) === groupTempKey,
    ).length;
    syncIngredients([
      ...normalizedValue,
      {
        id: undefined,
        tempIngredientKey: crypto.randomUUID(),
        ingredientId: "",
        amount: null,
        unitId: null,
        nutritionTarget: "BOTH",
        additionalInfo: null,
        groupTempKey,
        position: lanePosition,
      },
    ]);
  };

  const addGroup = () => {
    const nextGroups = [
      ...normalizedGroups,
      {
        id: undefined,
        tempGroupKey: crypto.randomUUID(),
        name: "New group",
        position: normalizedGroups.length,
      },
    ];
    syncGroupsAndIngredients(nextGroups, [...normalizedValue]);
    const newGroupKey = nextGroups[nextGroups.length - 1]!.tempGroupKey;
    setLaneOrder((previous) => {
      const next = [...previous];
      if (!next.includes(UNGROUPED_LANE_KEY)) {
        next.push(UNGROUPED_LANE_KEY);
      }
      if (!next.includes(newGroupKey)) {
        next.push(newGroupKey);
      }
      return next;
    });
  };

  const renameGroup = (groupTempKey: string, name: string) => {
    const nextGroups = normalizedGroups.map((group) =>
      group.tempGroupKey === groupTempKey ? { ...group, name } : group,
    );
    onGroupsChange(nextGroups);
  };

  const deleteGroup = (groupTempKey: string) => {
    const normalized = removeIngredientGroup({
      groups: normalizedGroups,
      ingredients: normalizedValue,
      groupTempKey,
    });
    onGroupsChange(normalized.groups);
    onChange(normalized.ingredients);
  };

  const removeIngredient = (tempIngredientKey: string) => {
    syncIngredients(
      normalizedValue.filter(
        (ingredient) => ingredient.tempIngredientKey !== tempIngredientKey,
      ),
    );
  };

  const updateIngredient = (
    tempIngredientKey: string,
    patch: Partial<RecipeIngredientInputType>
  ) => {
    const updated = normalizedValue.map((ingredient) =>
      ingredient.tempIngredientKey === tempIngredientKey
        ? { ...ingredient, ...patch }
        : ingredient,
    );
    syncIngredients(updated);
  };

  const getUnitsForIngredient = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing?.unitConversions ?? [];
  };

  // Export helper for unit tests so default-unit behavior remains locked down.
  const getDefaultUnitIdForIngredient = (ingredientId: string) => {
    const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
    if (!ingredient) {
      return null;
    }
    return resolveDefaultUnitIdForIngredient({
      defaultUnitId: ingredient.defaultUnitId,
      unitConversions: ingredient.unitConversions,
    });
  };

  const onDropToSlot = (
    targetGroupTempKey: string | null,
    targetPosition: number,
  ) => {
    if (!draggingIngredientKey) {
      return;
    }
    const moved = moveIngredientToPosition({
      ingredients: normalizedValue,
      groups: normalizedGroups,
      ingredientTempKey: draggingIngredientKey,
      targetGroupTempKey,
      targetPosition,
    });
    onChange(moved.ingredients);
    setActiveIngredientDropSlot(null);
    setDraggingIngredientKey(null);
    stopAutoScroll();
  };

  const renderDropSlot = (targetGroupTempKey: string | null, targetPosition: number) => {
    const slotKey = `${targetGroupTempKey ?? UNGROUPED_LANE_KEY}-${targetPosition}`;
    const isIngredientDragging = Boolean(draggingIngredientKey) && !draggingLaneKey;
    const isActiveSlot = activeIngredientDropSlot === slotKey;
    return (
      <div
        key={slotKey}
        // Keep slots visible during drag so users can drop with less precision.
        className={`h-4 rounded border border-dashed transition-colors ${
          isIngredientDragging
            ? "border-muted-foreground/30 bg-muted/30"
            : "border-transparent bg-transparent"
        } ${isActiveSlot ? "border-primary/70 bg-primary/10" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (isIngredientDragging) {
            trackDragPointer(event.clientY);
            setActiveIngredientDropSlot(slotKey);
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (isIngredientDragging) {
            trackDragPointer(event.clientY);
            setActiveIngredientDropSlot(slotKey);
          }
        }}
        onDragLeave={() => {
          if (activeIngredientDropSlot === slotKey) {
            setActiveIngredientDropSlot(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingLaneKey) {
            return;
          }
          onDropToSlot(targetGroupTempKey, targetPosition);
        }}
        aria-hidden
      />
    );
  };

  const renderIngredientRow = (item: RecipeIngredientInputType) => {
    const units = getUnitsForIngredient(item.ingredientId);
    const rowIndex = normalizedValue.findIndex(
      (row) => row.tempIngredientKey === item.tempIngredientKey,
    );
    const isAmountDisabled = !item.unitId;
    return (
      <div
        key={item.tempIngredientKey || rowIndex}
        className={`${INGREDIENT_ROW_LAYOUT_CLASSES.rowContainer} ${
          draggingIngredientKey === item.tempIngredientKey ? "opacity-60" : ""
        }`}
      >
        {/* Primary editing row: drag handle, amount/unit, ingredient lookup. */}
        <div className={INGREDIENT_ROW_LAYOUT_CLASSES.primaryLine}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={INGREDIENT_ROW_LAYOUT_CLASSES.dragHandle}
            aria-label="Drag ingredient"
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              setDraggingIngredientKey(item.tempIngredientKey);
            }}
            onDragEnd={() => {
              setActiveIngredientDropSlot(null);
              setDraggingIngredientKey(null);
              stopAutoScroll();
            }}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            placeholder="Amount"
            value={item.amount == null ? "" : item.amount.toString()}
            onChange={(e) => {
              const numValue = e.target.value === "" ? null : parseFloat(e.target.value);
              updateIngredient(item.tempIngredientKey, { amount: numValue });
            }}
            className={INGREDIENT_ROW_LAYOUT_CLASSES.amountInput}
            min={0}
            step={0.1}
            disabled={isAmountDisabled}
          />

          <Select
            key={`${item.ingredientId}-${rowIndex}`}
            // Keep Select controlled with empty-string sentinel to avoid stale Radix trigger text.
            value={item.unitId ?? ""}
            onValueChange={(unitId) => {
              if (!unitId) {
                // Clearing unit must also clear amount for nullable-unit flow.
                updateIngredient(item.tempIngredientKey, { unitId: null, amount: null });
                return;
              }
              updateIngredient(item.tempIngredientKey, { unitId });
            }}
            disabled={!item.ingredientId}
          >
            <SelectTrigger className={INGREDIENT_ROW_LAYOUT_CLASSES.unitTrigger}>
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((uc) => (
                <SelectItem key={uc.unitId} value={uc.unitId}>
                  {getUnitDisplayName({
                    amount: item.amount,
                    unitName: uc.unit.name,
                    unitNamePlural: uc.unit.namePlural ?? null,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className={INGREDIENT_ROW_LAYOUT_CLASSES.ingredientContainer}>
            <SearchableSelect
              options={ingredientOptions}
              value={item.ingredientId || null}
              onValueChange={(next) => {
                if (!next) {
                  // Clearing ingredient should fully reset ingredient/unit/amount state.
                  updateIngredient(item.tempIngredientKey, buildClearIngredientPatch());
                  return;
                }
                const unitId = getDefaultUnitIdForIngredient(next);
                updateIngredient(item.tempIngredientKey, { ingredientId: next, unitId });
              }}
              onCreateOption={(typedName) => {
                if (rowIndex < 0) {
                  return;
                }
                onCreateIngredientRequested?.({
                  rowIndex,
                  initialName: typedName,
                });
              }}
              placeholder="Select ingredient..."
              searchPlaceholder="Search ingredients..."
              emptyLabel="No ingredient found."
              allowClear
              clearLabel="Clear ingredient"
              renderIcon={(option) => (
                <IngredientIcon
                  icon={option.icon ?? null}
                  name={option.label}
                  size={16}
                />
              )}
            />
          </div>
        </div>

        {/* Secondary row: utility actions and metadata fields. */}
        <div className={INGREDIENT_ROW_LAYOUT_CLASSES.secondaryLine}>
          <Button
            type="button"
            variant="ghost"
            disabled={!item.ingredientId}
            className={INGREDIENT_ROW_LAYOUT_CLASSES.utilityButton}
            onClick={() => {
              if (!item.ingredientId) {
                return;
              }
              onEditIngredientRequested?.(item.ingredientId);
            }}
          >
            Edit
          </Button>

          <Input
            type="text"
            placeholder="Additional info"
            value={item.additionalInfo || ""}
            onChange={(e) => {
              updateIngredient(item.tempIngredientKey, { additionalInfo: e.target.value });
            }}
            className={INGREDIENT_ROW_LAYOUT_CLASSES.additionalInfoInput}
            maxLength={50}
          />

          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="text-muted-foreground">Nutrition target:</span>
            <Button
              type="button"
              size="sm"
              variant={
                (item.nutritionTarget ?? "BOTH") === "PRIMARY_ONLY"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                updateIngredient(item.tempIngredientKey, {
                  nutritionTarget: getNextNutritionTarget(
                    item.nutritionTarget,
                    "PRIMARY_ONLY",
                  ),
                })
              }
            >
              Jagoda
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                (item.nutritionTarget ?? "BOTH") === "SECONDARY_ONLY"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                updateIngredient(item.tempIngredientKey, {
                  nutritionTarget: getNextNutritionTarget(
                    item.nutritionTarget,
                    "SECONDARY_ONLY",
                  ),
                })
              }
            >
              Nelson
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={INGREDIENT_ROW_LAYOUT_CLASSES.secondaryRemoveButton}
            onClick={() => removeIngredient(item.tempIngredientKey)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderLane = (lane: {
    laneKey: string;
    title: string;
    groupTempKey: string | null;
    allowRename?: boolean;
  }) => {
    const laneRows = getLaneRows(lane.groupTempKey);
    return (
      <section key={lane.groupTempKey ?? UNGROUPED_LANE_KEY} className="space-y-2 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={INGREDIENT_ROW_LAYOUT_CLASSES.dragHandle}
            aria-label={`Drag lane ${lane.title}`}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              setDraggingLaneKey(lane.laneKey);
            }}
            onDragEnd={() => {
              setActiveLaneDropIndex(null);
              setDraggingLaneKey(null);
              stopAutoScroll();
            }}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          {lane.allowRename ? (
            <Input
              value={lane.title}
              onChange={(event) => {
                if (!lane.groupTempKey) {
                  return;
                }
                renameGroup(lane.groupTempKey, event.target.value);
              }}
              placeholder="Group name"
              className="max-w-sm"
            />
          ) : (
            <h4 className="text-sm font-semibold">{lane.title}</h4>
          )}

          {lane.allowRename && lane.groupTempKey ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => deleteGroup(lane.groupTempKey!)}
            >
              Remove group
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          {renderDropSlot(lane.groupTempKey, 0)}
          {laneRows.map((row, index) => (
            <React.Fragment key={row.tempIngredientKey}>
              {renderIngredientRow(row)}
              {renderDropSlot(lane.groupTempKey, index + 1)}
            </React.Fragment>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => addIngredient(lane.groupTempKey)}
        >
          Add Ingredient
        </Button>
      </section>
    );
  };

  const ungroupedRows = getLaneRows(null);
  const shouldRenderUngroupedLane =
    ungroupedRows.length > 0 || (normalizedGroups.length === 0 && normalizedValue.length > 0);
  const visibleLanes = laneOrder
    .map((laneKey) => {
      if (laneKey === UNGROUPED_LANE_KEY) {
        if (!shouldRenderUngroupedLane) {
          return null;
        }
        return {
          laneKey,
          title: normalizedGroups.length === 0 ? "Ingredients" : "Ungrouped",
          groupTempKey: null,
          allowRename: false,
        };
      }
      const group = normalizedGroups.find((entry) => entry.tempGroupKey === laneKey);
      if (!group) {
        return null;
      }
      return {
        laneKey,
        title: group.name,
        groupTempKey: group.tempGroupKey,
        allowRename: true,
      };
    })
    .filter((lane): lane is { laneKey: string; title: string; groupTempKey: string | null; allowRename: boolean } => Boolean(lane));

  const onDropLane = (targetIndex: number) => {
    if (!draggingLaneKey) {
      return;
    }
    const moved = moveLaneToPosition({
      groups: normalizedGroups,
      laneKey: draggingLaneKey,
      targetIndex,
    });
    onGroupsChange(moved.groups);
    setLaneOrder(moved.laneOrder);
    setActiveLaneDropIndex(null);
    setDraggingLaneKey(null);
    stopAutoScroll();
  };

  const renderLaneDropSlot = (index: number) => {
    const isLaneDragging = Boolean(draggingLaneKey);
    const isActiveLaneSlot = activeLaneDropIndex === index;
    return (
      <div
        key={`lane-drop-slot-${index}`}
        // Larger lane slots make group reordering easier to target.
        className={`h-4 rounded border border-dashed transition-colors ${
          isLaneDragging
            ? "border-muted-foreground/30 bg-muted/30"
            : "border-transparent bg-transparent"
        } ${isActiveLaneSlot ? "border-primary/70 bg-primary/10" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (isLaneDragging) {
            trackDragPointer(event.clientY);
            setActiveLaneDropIndex(index);
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (isLaneDragging) {
            trackDragPointer(event.clientY);
            setActiveLaneDropIndex(index);
          }
        }}
        onDragLeave={() => {
          if (activeLaneDropIndex === index) {
            setActiveLaneDropIndex(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropLane(index);
        }}
        aria-hidden
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ingredient groups</h3>
        <div className="flex items-center gap-2">
          {/* Keep ungrouped flow available without forcing groups first. */}
          <Button type="button" variant="outline" onClick={() => addIngredient(null)}>
            Add Ingredient
          </Button>
          <Button type="button" variant="outline" onClick={addGroup}>
            Add Group
          </Button>
        </div>
      </div>

      {renderLaneDropSlot(0)}
      {visibleLanes.map((lane, index) => (
        <React.Fragment key={`lane-${lane.laneKey}`}>
          {renderLane(lane)}
          {renderLaneDropSlot(index + 1)}
        </React.Fragment>
      ))}
    </div>
  );
}

export function getDefaultUnitIdFromConversions(
  units: IngredientType["unitConversions"],
) {
  // Backward-compatible export for older call sites and tests.
  return getFallbackUnitIdFromConversions(units);
}

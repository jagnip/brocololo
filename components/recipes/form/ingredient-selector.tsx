"use client";

import * as React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
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
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import {
  getDefaultUnitIdForIngredient as resolveDefaultUnitIdForIngredient,
  getFallbackUnitIdFromConversions,
} from "@/lib/ingredients/default-unit";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  // min-w-0: grid/flex parents default to min-width:auto; without this, nested inputs can widen past the viewport (e.g. iPhone SE).
  rowContainer: "min-w-0 max-w-full space-y-2 rounded-md border p-2",
  // Phone: col (row1 drag+ingredient; row2–3 qty). Tablet md–lg: row2 = amount|unit|additional one line. Desktop lg+: flattened primary row + additional line.
  primaryLine:
    "flex w-full min-w-0 max-w-full flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2",
  primaryLineMobileIngredientRow:
    "flex w-full min-w-0 items-start gap-2 lg:contents",
  // Phone: col [amount+unit sub-row][additional]. Tablet: single row (inner amountUnitRow uses md:contents). lg:contents for desktop order.
  primaryLineMobileQtyRow:
    "flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-2 lg:contents",
  // Phone: amount|unit only. md+: contents so amount, unit, additional sit in one row (tablet) or flatten to primaryLine (lg).
  amountUnitRow:
    "flex w-full min-w-0 flex-row items-stretch gap-2 md:contents",
  unitSelectWrapper:
    "flex min-h-0 min-w-0 w-full flex-1 md:w-32 md:flex-none md:shrink-0 lg:order-3",
  ingredientWithActionsRow:
    "flex w-full min-w-0 flex-1 items-center gap-2 lg:order-4 lg:min-w-0 lg:flex-1",
  ingredientRowActions: "flex shrink-0 items-center gap-2",
  // Nutrition-only row under additional info / actions.
  nutritionTargetRow:
    "flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap",
  // Bigger handle improves drag start reliability on mouse/touch.
  dragHandle: "h-8 w-8 shrink-0 touch-none cursor-grab active:cursor-grabbing",
  // Phone: flex-1 beside unit. md+: fixed narrow field (tablet one-row + desktop) — flex-none stops amount from growing in the lg row.
  amountInput:
    "min-w-0 w-full max-w-full flex-1 basis-0 md:w-24 md:flex-none md:shrink-0 md:basis-auto lg:order-2",
  unitTrigger:
    "min-w-0 w-full max-w-full md:w-32 md:shrink-0 lg:shrink-0",
  ingredientContainer: "min-w-0 w-full flex-1",
  // Phone: own row, full width. Tablet: same row as amount+unit (flex-1). Desktop: full-width line under primary row (lg:flex-none overrides md:flex-1).
  additionalInfoInput:
    "min-w-0 w-full max-w-full md:w-auto md:min-w-0 md:flex-1 md:basis-0 lg:order-5 lg:basis-full lg:w-full lg:flex-none",
  utilityButton: "shrink-0",
  secondaryRemoveButton: "shrink-0",
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

  const groupedByLane = new Map<
    string,
    Array<(typeof indexedIngredients)[number]>
  >();
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
  const [draggingIngredientKey, setDraggingIngredientKey] = React.useState<
    string | null
  >(null);
  const [draggingLaneKey, setDraggingLaneKey] = React.useState<string | null>(
    null,
  );
  const [activeIngredientDropSlot, setActiveIngredientDropSlot] =
    React.useState<string | null>(null);
  const [activeLaneDropIndex, setActiveLaneDropIndex] = React.useState<
    number | null
  >(null);
  const dragPointerYRef = React.useRef<number | null>(null);
  const autoScrollFrameRef = React.useRef<number | null>(null);
  const isDraggingRef = React.useRef(false);
  // Keep option transformation memoized for smoother typing in cmdk.
  const ingredientOptions = React.useMemo<SearchableSelectOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: getIngredientDisplayName(ingredient.name, ingredient.brand),
        icon: ingredient.icon,
        // Keep raw name as search text so brand doesn't interfere with name-only searches.
        searchText: ingredient.brand ? ingredient.name : undefined,
      })),
    [ingredients],
  );

  const normalizedGroups = React.useMemo(
    () => normalizeGroupPositions(groups),
    [groups],
  );
  const canonicalLaneOrder = React.useMemo(
    () => [
      UNGROUPED_LANE_KEY,
      ...normalizedGroups.map((group) => group.tempGroupKey),
    ],
    [normalizedGroups],
  );
  const [laneOrder, setLaneOrder] =
    React.useState<string[]>(canonicalLaneOrder);

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
      autoScrollFrameRef.current =
        window.requestAnimationFrame(runAutoScrollFrame);
      return;
    }
    let deltaY = 0;
    // Auto-scroll viewport near top/bottom edges so long drags are possible.
    if (pointerY <= AUTO_SCROLL_EDGE_THRESHOLD_PX) {
      const intensity =
        (AUTO_SCROLL_EDGE_THRESHOLD_PX - pointerY) /
        AUTO_SCROLL_EDGE_THRESHOLD_PX;
      deltaY = -Math.ceil(Math.max(1, intensity * AUTO_SCROLL_MAX_STEP_PX));
    } else if (pointerY >= window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX) {
      const intensity =
        (pointerY - (window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX)) /
        AUTO_SCROLL_EDGE_THRESHOLD_PX;
      deltaY = Math.ceil(Math.max(1, intensity * AUTO_SCROLL_MAX_STEP_PX));
    }
    if (deltaY !== 0) {
      window.scrollBy(0, deltaY);
    }
    autoScrollFrameRef.current =
      window.requestAnimationFrame(runAutoScrollFrame);
  }, [stopAutoScroll]);

  const trackDragPointer = React.useCallback(
    (clientY: number) => {
      dragPointerYRef.current = clientY;
      if (autoScrollFrameRef.current == null) {
        autoScrollFrameRef.current =
          window.requestAnimationFrame(runAutoScrollFrame);
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
  }, [
    draggingIngredientKey,
    draggingLaneKey,
    stopAutoScroll,
    trackDragPointer,
  ]);

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
    patch: Partial<RecipeIngredientInputType>,
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
    const ingredient = ingredients.find(
      (candidate) => candidate.id === ingredientId,
    );
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

  const renderDropSlot = (
    targetGroupTempKey: string | null,
    targetPosition: number,
  ) => {
    const slotKey = `${targetGroupTempKey ?? UNGROUPED_LANE_KEY}-${targetPosition}`;
    const isIngredientDragging =
      Boolean(draggingIngredientKey) && !draggingLaneKey;
    const isActiveSlot = activeIngredientDropSlot === slotKey;
    // Zero layout height: the real target is an absolutely positioned band (h-10) centered on the seam,
    // overlapping adjacent rows so drops are easy while idle spacing stays flush (pointer-events off).
    return (
      <div
        key={slotKey}
        className="relative h-0 w-full shrink-0 overflow-visible"
      >
        <div
          className={cn(
            "absolute left-0 right-0 top-0 z-10 -translate-y-1/2 rounded border border-dashed transition-colors",
            isIngredientDragging
              ? "pointer-events-auto h-10 border-muted-foreground/30 bg-muted/30"
              : "pointer-events-none h-px border-transparent bg-transparent",
            isActiveSlot &&
              isIngredientDragging &&
              "border-primary/70 bg-primary/10",
          )}
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
      </div>
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
        {/* Primary: phone = 3 bands; tablet md–lg = row1 drag+ingredient, row2 amount|unit|additional; lg+ = flat row + additional line. */}
        <div className={INGREDIENT_ROW_LAYOUT_CLASSES.primaryLine}>
          <div
            className={INGREDIENT_ROW_LAYOUT_CLASSES.primaryLineMobileIngredientRow}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                INGREDIENT_ROW_LAYOUT_CLASSES.dragHandle,
                "lg:order-1",
              )}
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

            <div
              className={INGREDIENT_ROW_LAYOUT_CLASSES.ingredientWithActionsRow}
            >
              <div
                className={INGREDIENT_ROW_LAYOUT_CLASSES.ingredientContainer}
              >
                <SearchableSelect
                  className="min-w-0 max-w-full"
                  options={ingredientOptions}
                  value={item.ingredientId || null}
                  onValueChange={(next) => {
                    if (!next) {
                      // Clearing ingredient should fully reset ingredient/unit/amount state.
                      updateIngredient(
                        item.tempIngredientKey,
                        buildClearIngredientPatch(),
                      );
                      return;
                    }
                    const unitId = getDefaultUnitIdForIngredient(next);
                    updateIngredient(item.tempIngredientKey, {
                      ingredientId: next,
                      unitId,
                    });
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
              <div
                className={INGREDIENT_ROW_LAYOUT_CLASSES.ingredientRowActions}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!item.ingredientId}
                  className={INGREDIENT_ROW_LAYOUT_CLASSES.utilityButton}
                  aria-label="Edit ingredient"
                  onClick={() => {
                    if (!item.ingredientId) {
                      return;
                    }
                    onEditIngredientRequested?.(item.ingredientId);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={
                    INGREDIENT_ROW_LAYOUT_CLASSES.secondaryRemoveButton
                  }
                  aria-label="Remove ingredient"
                  onClick={() => removeIngredient(item.tempIngredientKey)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className={INGREDIENT_ROW_LAYOUT_CLASSES.primaryLineMobileQtyRow}
          >
            <div
              className={INGREDIENT_ROW_LAYOUT_CLASSES.amountUnitRow}
            >
              <Input
                type="number"
                placeholder="Amount"
                value={item.amount == null ? "" : item.amount.toString()}
                onChange={(e) => {
                  const numValue =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                  updateIngredient(item.tempIngredientKey, { amount: numValue });
                }}
                className={INGREDIENT_ROW_LAYOUT_CLASSES.amountInput}
                min={0}
                // Allow arbitrary decimal precision (e.g. 0.75) in ingredient amounts.
                step="any"
                disabled={isAmountDisabled}
              />

              <div
                className={INGREDIENT_ROW_LAYOUT_CLASSES.unitSelectWrapper}
              >
                <Select
                  key={`${item.ingredientId}-${rowIndex}`}
                  // Keep Select controlled with empty-string sentinel to avoid stale Radix trigger text.
                  value={item.unitId ?? ""}
                  onValueChange={(unitId) => {
                    if (!unitId) {
                      // Clearing unit must also clear amount for nullable-unit flow.
                      updateIngredient(item.tempIngredientKey, {
                        unitId: null,
                        amount: null,
                      });
                      return;
                    }
                    updateIngredient(item.tempIngredientKey, { unitId });
                  }}
                  disabled={!item.ingredientId}
                >
                  <SelectTrigger
                    className={INGREDIENT_ROW_LAYOUT_CLASSES.unitTrigger}
                  >
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
              </div>
            </div>

            {/* Phone: third row. Tablet: same row as amount+unit. Desktop: line under primary controls. */}
            <Input
              type="text"
              placeholder="Additional info"
              value={item.additionalInfo || ""}
              onChange={(e) => {
                updateIngredient(item.tempIngredientKey, {
                  additionalInfo: e.target.value,
                });
              }}
              className={INGREDIENT_ROW_LAYOUT_CLASSES.additionalInfoInput}
              maxLength={50}
            />
          </div>
        </div>

        {/* Third row: nutrition target — label + person toggles. */}
        <div className={INGREDIENT_ROW_LAYOUT_CLASSES.nutritionTargetRow}>
          <Label
            id={`nutrition-target-label-${item.tempIngredientKey}`}
            className="shrink-0 normal-case tracking-normal"
          >
            Only use for:
          </Label>
          <div
            className="flex flex-wrap items-center gap-2"
            role="radiogroup"
            aria-labelledby={`nutrition-target-label-${item.tempIngredientKey}`}
          >
            <Button
              type="button"
              size="default"
              variant={
                (item.nutritionTarget ?? "BOTH") === "PRIMARY_ONLY"
                  ? "default"
                  : "outline"
              }
              role="radio"
              aria-checked={(item.nutritionTarget ?? "BOTH") === "PRIMARY_ONLY"}
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
              size="default"
              variant={
                (item.nutritionTarget ?? "BOTH") === "SECONDARY_ONLY"
                  ? "default"
                  : "outline"
              }
              role="radio"
              aria-checked={
                (item.nutritionTarget ?? "BOTH") === "SECONDARY_ONLY"
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
      <section
        key={lane.groupTempKey ?? UNGROUPED_LANE_KEY}
        className="min-w-0 max-w-full space-y-1 rounded-md p-2"
      >
        <div className="flex min-w-0 items-center gap-2">
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
              className="min-w-0 max-w-full flex-1 sm:max-w-sm"
            />
          ) : (
            <h4 className="text-sm font-semibold">{lane.title}</h4>
          )}

          {lane.allowRename && lane.groupTempKey ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="ml-auto shrink-0"
              aria-label="Remove group"
              onClick={() => deleteGroup(lane.groupTempKey!)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
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
    ungroupedRows.length > 0 ||
    (normalizedGroups.length === 0 && normalizedValue.length > 0);
  const visibleLanes = laneOrder
    .map((laneKey) => {
      if (laneKey === UNGROUPED_LANE_KEY) {
        if (!shouldRenderUngroupedLane) {
          return null;
        }
        return {
          laneKey,
          title: "Ungrouped",
          groupTempKey: null,
          allowRename: false,
        };
      }
      const group = normalizedGroups.find(
        (entry) => entry.tempGroupKey === laneKey,
      );
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
    .filter(
      (
        lane,
      ): lane is {
        laneKey: string;
        title: string;
        groupTempKey: string | null;
        allowRename: boolean;
      } => Boolean(lane),
    );

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
        className="relative h-0 w-full shrink-0 overflow-visible"
      >
        <div
          className={cn(
            "absolute left-0 right-0 top-0 z-10 -translate-y-1/2 rounded border border-dashed transition-colors",
            isLaneDragging
              ? "pointer-events-auto h-10 border-muted-foreground/30 bg-muted/30"
              : "pointer-events-none h-px border-transparent bg-transparent",
            isActiveLaneSlot &&
              isLaneDragging &&
              "border-primary/70 bg-primary/10",
          )}
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
      </div>
    );
  };

  return (
    <div className="min-w-0 w-full max-w-full">
      <div className="mb-3">
        <Subheader>Ingredients</Subheader>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {visibleLanes.map((lane, index) => (
          <div
            key={`lane-${lane.laneKey}`}
            className="flex min-w-0 flex-col gap-0"
          >
            {index === 0 ? renderLaneDropSlot(0) : null}
            {renderLane(lane)}
            {renderLaneDropSlot(index + 1)}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-start">
        <Button type="button" variant="outline" onClick={addGroup}>
          Add group
        </Button>
      </div>
    </div>
  );
}

export function getDefaultUnitIdFromConversions(
  units: IngredientType["unitConversions"],
) {
  // Backward-compatible export for older call sites and tests.
  return getFallbackUnitIdFromConversions(units);
}

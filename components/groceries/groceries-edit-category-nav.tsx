"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import {
  SegmentedFilterButton,
  SegmentedFilterGroup,
} from "@/components/ui/segmented-filter-button";
import { cn } from "@/lib/utils";

type GroceriesEditCategoryNavSection = {
  categoryId: string;
  title: string;
};

type GroceriesEditCategoryNavProps = {
  sections: GroceriesEditCategoryNavSection[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  className?: string;
};

// Pause spy-driven centering while the user swipes the chip row manually.
const USER_CHIP_SCROLL_IDLE_MS = 400;

function isChipFullyVisible(container: HTMLElement, chip: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  return (
    chipRect.left >= containerRect.left &&
    chipRect.right <= containerRect.right
  );
}

/** Center the active chip in the strip when it is off-screen. */
function centerChipInStrip(container: HTMLElement, chip: HTMLElement) {
  const left = chip.offsetLeft - container.clientWidth / 2 + chip.offsetWidth / 2;
  container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
}

type CategoryChipProps = {
  categoryId: string;
  title: string;
  selected: boolean;
  chipRef: (node: HTMLButtonElement | null) => void;
  onSelect: (categoryId: string) => void;
};

const CategoryChip = memo(function CategoryChip({
  categoryId,
  title,
  selected,
  chipRef,
  onSelect,
}: CategoryChipProps) {
  return (
    <SegmentedFilterButton
      ref={chipRef}
      selected={selected}
      aria-pressed={selected}
      className="shrink-0 snap-start transition-none"
      onClick={() => onSelect(categoryId)}
    >
      {title}
    </SegmentedFilterButton>
  );
});

/** Sticky single-row category chips; swipe horizontally when categories overflow. */
export function GroceriesEditCategoryNav({
  sections,
  selectedCategoryId,
  onCategorySelect,
  className,
}: GroceriesEditCategoryNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const chipRefCallbacks = useRef(
    new Map<string, (node: HTMLButtonElement | null) => void>(),
  );
  const onCategorySelectRef = useRef(onCategorySelect);
  const userScrollingChipsRef = useRef(false);
  const userChipScrollIdleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isProgrammaticChipScrollRef = useRef(false);
  const prevSelectedCategoryIdRef = useRef<string | null>(null);
  onCategorySelectRef.current = onCategorySelect;

  const centerChip = useCallback((categoryId: string, force = false) => {
    const container = scrollContainerRef.current;
    const chip = chipRefs.current.get(categoryId);
    if (!container || !chip) return;
    if (!force && isChipFullyVisible(container, chip)) return;
    isProgrammaticChipScrollRef.current = true;
    centerChipInStrip(container, chip);
    requestAnimationFrame(() => {
      isProgrammaticChipScrollRef.current = false;
    });
  }, []);

  const getChipRef = useCallback((categoryId: string) => {
    const existing = chipRefCallbacks.current.get(categoryId);
    if (existing) return existing;

    const callback = (node: HTMLButtonElement | null) => {
      if (node) {
        chipRefs.current.set(categoryId, node);
      } else {
        chipRefs.current.delete(categoryId);
      }
    };
    chipRefCallbacks.current.set(categoryId, callback);
    return callback;
  }, []);

  const markUserChipScroll = useCallback(() => {
    if (isProgrammaticChipScrollRef.current) return;
    userScrollingChipsRef.current = true;
    clearTimeout(userChipScrollIdleRef.current);
    userChipScrollIdleRef.current = setTimeout(() => {
      userScrollingChipsRef.current = false;
    }, USER_CHIP_SCROLL_IDLE_MS);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onTouchStart = () => {
      userScrollingChipsRef.current = true;
    };

    container.addEventListener("scroll", markUserChipScroll, { passive: true });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", markUserChipScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", markUserChipScroll);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", markUserChipScroll);
      clearTimeout(userChipScrollIdleRef.current);
    };
  }, [markUserChipScroll]);

  // Only re-center when scroll-spy picks a new category — not while the same chip stays active.
  useEffect(() => {
    if (!selectedCategoryId || userScrollingChipsRef.current) return;
    if (prevSelectedCategoryIdRef.current === selectedCategoryId) return;
    prevSelectedCategoryIdRef.current = selectedCategoryId;

    const frame = requestAnimationFrame(() => {
      if (userScrollingChipsRef.current) return;
      centerChip(selectedCategoryId);
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedCategoryId, centerChip]);

  const onChipSelect = useCallback((categoryId: string) => {
    prevSelectedCategoryIdRef.current = categoryId;
    centerChip(categoryId, true);
    onCategorySelectRef.current(categoryId);
  }, [centerChip]);

  if (sections.length === 0) return null;

  return (
    <div
      className={cn(
        "sticky top-14 z-10 w-full min-w-0 max-w-full overflow-x-hidden bg-background",
        className,
      )}
    >
      <div className="chip-strip-fade relative -mx-gutter px-gutter">
        <div
          ref={scrollContainerRef}
          className="scroll-touch scroll-ps-gutter scroll-pe-gutter snap-x snap-mandatory w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain hide-scrollbar py-2.5 pb-3"
        >
          <SegmentedFilterGroup
            aria-label="Grocery categories"
            className="w-max max-w-none flex-nowrap gap-item"
          >
            {/* Edge spacers scroll with chips — inset at rest, edge-to-edge when scrolled. */}
            <div className="w-gutter shrink-0 snap-none" aria-hidden />
            {sections.map((section) => (
              <CategoryChip
                key={section.categoryId}
                categoryId={section.categoryId}
                title={section.title}
                selected={selectedCategoryId === section.categoryId}
                chipRef={getChipRef(section.categoryId)}
                onSelect={onChipSelect}
              />
            ))}
            <div className="w-gutter shrink-0 snap-none" aria-hidden />
          </SegmentedFilterGroup>
        </div>
      </div>
    </div>
  );
}

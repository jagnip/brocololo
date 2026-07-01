"use client";

import { useEffect, useRef } from "react";
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

// Matches --spacing-gutter; keeps first/last chips inset when scrolled to edges.
const SCROLL_EDGE_PADDING_PX = 16;

function isChipFullyVisible(container: HTMLElement, chip: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  return (
    chipRect.left >= containerRect.left + SCROLL_EDGE_PADDING_PX &&
    chipRect.right <= containerRect.right - SCROLL_EDGE_PADDING_PX
  );
}

function scrollChipIntoView(container: HTMLElement, chip: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();

  if (chipRect.left < containerRect.left + SCROLL_EDGE_PADDING_PX) {
    container.scrollTo({
      left: Math.max(
        0,
        container.scrollLeft + (chipRect.left - containerRect.left - SCROLL_EDGE_PADDING_PX),
      ),
      behavior: "smooth",
    });
    return;
  }

  if (chipRect.right > containerRect.right - SCROLL_EDGE_PADDING_PX) {
    container.scrollTo({
      left: Math.max(
        0,
        container.scrollLeft + (chipRect.right - containerRect.right + SCROLL_EDGE_PADDING_PX),
      ),
      behavior: "smooth",
    });
  }
}

/** Sticky single-row category chips; swipe horizontally when categories overflow. */
export function GroceriesEditCategoryNav({
  sections,
  selectedCategoryId,
  onCategorySelect,
  className,
}: GroceriesEditCategoryNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  // Skip horizontal nudge when the user tapped an already-visible chip.
  const userClickedVisibleChipRef = useRef(false);

  // Keep the active chip visible while scroll-spy updates (not after a visible tap).
  useEffect(() => {
    if (!selectedCategoryId) return;
    const chip = chipRefs.current.get(selectedCategoryId);
    const container = scrollContainerRef.current;
    if (!chip || !container) return;

    if (userClickedVisibleChipRef.current) {
      userClickedVisibleChipRef.current = false;
      return;
    }

    if (isChipFullyVisible(container, chip)) return;

    const frame = requestAnimationFrame(() => {
      scrollChipIntoView(container, chip);
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedCategoryId]);

  if (sections.length === 0) return null;

  return (
    // Sticky shell: clip horizontal bleed here (safe on self) so w-max chips stay in the row.
    <div
      className={cn(
        "sticky top-14 z-10 w-full min-w-0 max-w-full overflow-x-hidden bg-background",
        className,
      )}
    >
      <div
        ref={scrollContainerRef}
        className="w-full min-w-0 overflow-x-auto overscroll-x-contain hide-scrollbar py-2"
      >
        <SegmentedFilterGroup
          aria-label="Grocery categories"
          className="w-max max-w-none flex-nowrap gap-item px-gutter"
        >
          {sections.map((section) => {
            const isSelected = selectedCategoryId === section.categoryId;
            return (
              <SegmentedFilterButton
                key={section.categoryId}
                ref={(node) => {
                  if (node) {
                    chipRefs.current.set(section.categoryId, node);
                  } else {
                    chipRefs.current.delete(section.categoryId);
                  }
                }}
                selected={isSelected}
                aria-pressed={isSelected}
                className="shrink-0"
                onClick={() => {
                  const container = scrollContainerRef.current;
                  const chip = chipRefs.current.get(section.categoryId);
                  if (container && chip && isChipFullyVisible(container, chip)) {
                    userClickedVisibleChipRef.current = true;
                  }
                  onCategorySelect(section.categoryId);
                }}
              >
                {section.title}
              </SegmentedFilterButton>
            );
          })}
        </SegmentedFilterGroup>
      </div>
    </div>
  );
}

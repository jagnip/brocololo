---
name: Turniply
description: Existing meal planning and food logging interface
colors:
  primary: "oklch(0.72 0.165 13.4)"
  background: "oklch(0.992 0.008 350)"
  foreground: "oklch(0.372 0.044 257.3)"
  card: "oklch(1 0 0)"
  muted-foreground: "oklch(0.554 0.046 257.4)"
  border: "oklch(0.941 0.024 12.4)"
typography:
  heading:
    fontFamily: Quicksand
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  body:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
rounded:
  sm: 0.375rem
  md: 0.5rem
  lg: 0.625rem
spacing:
  tight: 0.25rem
  item: 0.5rem
  comfort: 0.75rem
  block: 1rem
  empty-x: 1.5rem
  empty-y: 3.5rem
---

# Turniply Design System

## Overview

Preserve the incumbent visual identity: rose accents, light canvas, slate text, rounded controls, Quicksand headings, and Geist body text. This document records the existing system in `app/globals.css`, not a new visual direction. CSS remains the source for theme-specific values, including dark mode.

## Colors

Use semantic Tailwind roles backed by CSS variables: `background`, `foreground`, `card`, `card-foreground`, `primary`, `primary-foreground`, `muted-foreground`, `border`, and `destructive`. Preserve existing category and nutrition palettes. Do not introduce one-off color values.

## Typography

Use `type-h1`, `type-h2`, `type-h3`, `type-body`, and `type-caption` presets. Headings establish task hierarchy; supporting descriptions use body text and muted foreground. Keep numerical nutrition values tabular.

Badges across the app inherit the Badge primitive's text-xs, semibold typography, including nested text and per-person ingredient shares. Do not override badge font size, weight, or line height locally. Preserve semantic variants, muted details, and tabular numerals where relevant. Do not introduce an icon-only badge variant.

## Layout

Use the existing `page-container` and Tailwind spacing scale (one unit = 0.25rem), plus named spacing tokens above. Existing layouts use wrapping flex controls and responsive meal grids. Mobile navigation uses the sidebar sheet; desktop supports expanded and icon-only navigation.

Meal Plan and Log are peer destinations. Meal Plan owns household meal editing, dates, deletion, and grocery generation. Log owns person/day selection and actual intake. Both retain plan switching. Breadcrumbs identify the destination; omit duplicate page titles, descriptions, and counterpart buttons. Use the sidebar to move between destinations. Do not duplicate navigation as Manage/Track tabs.

Meal Plan's cooking checklist sits above the unchanged daily planner. Group unique meals under Breakfast, Lunch, and Dinner, with three columns on desktop and stacked groups on mobile. Rows contain only a Checkbox, small thumbnail, meal name, and planned-slot count. Group counts show unique meals left to cook; partially checked meals count until all matching slots are checked. Omit an overall heading, progress count, helper text, row subtitles, and Reset/Hide controls. Checking a row updates all matching slots in the current plan; partial completion uses an indeterminate checkbox. Checked rows stay in place with muted text and grayscale thumbnails. Reuse the existing daily-card checked state without changing card markup or styling.

Rolling meals initialize once from the four newest created plans' unused scheduled meals and Storage meal counts. Each identity comes only from the newest source plan where it has a positive count, preventing previously rolled meals from being counted twice. Repository recipes use recipe ID identity; custom meals use meal type, normalized name, and ingredients. Placement uses the new plan's eaters. Keep the selector and editable meal counts, omit the import button, and preserve user removals during regeneration. Custom rolling meals stay in their source meal type and behave as non-batch repeats. Batch recipe entries expose an unchecked-by-default Already cooked checkbox, meaning 10 minutes preparation and total time. Scheduled cards append one status to the meal description with a middot: Already cooked takes precedence over Rolled over. Grocery selection offers fresh quantities checked by default and rolled-over/already-cooked quantities unchecked but selectable, including custom meals. Keep these sources separate when the same meal has both, and include available quantities only on explicit opt-in. Storage is editable for all batch recipes except Already cooked batches. Anonymous extra portions do not carry over and are not managed in the active planner.

Automatic generation puts any unscheduled remainder of an uncooked batch in Storage with its source meal's cooking audience. Scheduled meals plus Storage must equal the requested batch count; rolling batches use their remaining rolling count rather than the recipe default. Stored rolling meals count as allocated and must not be allocated again. Already cooked batches and non-batch repeats do not receive automatic Storage rows. Preserve existing Storage rows when filling empty slots.

Manual placement schedules only explicitly chosen slots for an uncooked batch; its remaining requested meals enter Storage with the placement audience rather than filling future slots. Adding another slot to that batch consumes Storage, preferring a row with the same audience. The existing batch badge is the only allocation feedback. Removing scheduled meals does not restore Storage.

New planner forms default all breakfasts and weekday lunches to the self household member (Jagoda in the current household). Weekend lunches and all dinners default to the whole household. These are initial selections only; preserve audience edits and saved-plan audiences.

Recipe preferences appear after Planner settings and before Ingredients in the editor, without a description. Each household member gets the existing SegmentedControl beside their name in a compact, aligned two-column layout, including on mobile. Use Lucide ThumbsDown for Avoid, Minus for Neutral, ThumbsUp for Like, and Heart for Love in square icon segments with accessible text and hover titles. Neutral means no stored row. Like and Love contribute persistent bonuses averaged across all assigned eaters. The current trial uses weight 2: Like contributes up to 1 point and Love up to 2. Recency and repeat scoring remain unchanged. Love can outweigh the first-repeat penalty of 1.5 but not the maximum penalty of 3; with other factors equal, unused neutral recipes beat favorites after two selections. Any eater's Avoid vetoes automatic selection, including rolling recipes, but manual placement and existing filled slots remain allowed. Generated batch continuations retain their source audience.

Recipe detail's People module replaces the Nutrition section beside the photos, retaining its mobile position. Show one Card per selected Cooking For member in household order, matching Meals to shop for: rounded-md corners, p-4 padding, no shadow, gap-3 between cards, and muted hover/focus-within surfaces. Each card's header pairs the person's medium-weight body name with a read-only secondary preference badge using the editor's icon and a visible Avoid, Like, or Love label in shared badge typography with muted text. Neutral preferences have no badge; retain the selected person's card and nutrition. The editor still offers Neutral. Below the header, show editable calories followed by fat, carbs, and protein without a Per serving caption; nutrition remains per serving. Keep the nutrition reset action beside People. Hide the entire card for members outside Cooking For, and restore it with its nutrition and saved preference when reselected. Cooking For continues to manage portions; omit the separate Preferences section. Preserve existing card tokens, wrapping controls, and long-name handling.

## Elevation & Depth

Preserve existing `shadow-xs` and rose-tinted `shadow-rose-sm/md/lg/xl` tokens from `app/globals.css`. Do not add decorative elevation to page headers.

## Shapes

Use existing radius tokens and primitive defaults. Cards and dialogs use the existing rounded and bordered surface language.

## Components

- `components/ui/`: immutable base primitives, including Sidebar, Button, Select, Tabs, AlertDialog, Skeleton, and Breadcrumbs.
- `AppSidebar`: shared navigation with one active peer destination and mobile dismissal on selection.
- `PlanSwitcherSelect`: existing breadcrumb or in-page plan switching.
- `PlanEditor`: household meal arrangement and editing.
- `PlanBatchDialog`: scheduled batch summary and destructive outlined Remove batch action, opened from batch badges in Create and Manage plan. Storage editing is available for all batch recipes except Already cooked batches. Uncooked Storage quantities contribute to batch totals, cooking links, and grocery selection; cooked batches ignore Storage quantities.
- `PlanMealChecklist`: grouped cooking checklist composing Checkbox, Label, and existing recipe-image handling; derived from the editor's live plan.
- `LogDayViewController`: day-first actual intake, with optional all-days view.
- `LogDayPersonToolbarControls`: existing date navigation and person selection.
- `PlanCurrentEmpty`: actionable no-plan state reused for Meal Plan, Log, and Groceries.
- `TopbarConfigController`: contextual breadcrumbs and actions.
- `PeopleSection`: recipe-detail household preferences and per-serving nutrition, composing `Card`, `NutritionPersonSummaryRow`, `Badge`, and `EditableCaloriesField` with the Meals to shop for card styling.

Reuse these components; compose primitives rather than modifying `components/ui/`. Preserve their hover, focus, disabled, loading, and error patterns. Display saving feedback next to the page task.

Plan, Log, and Groceries switchers show only the five newest created plans. Older plans remain stored and accessible by direct link; their date range is a static breadcrumb until the all-plans page is introduced.

## Do's and Don'ts

- Keep planning and recorded intake distinguishable by headings and controls, not a new palette.
- Keep plan-management and destructive actions on Meal Plan, not Log.
- Preserve existing data, grocery behavior, and old saved links.
- Keep toolbar controls wrapping on mobile and keyboard accessible.
- Do not add arbitrary pixel values, new fonts, or near-duplicate components.

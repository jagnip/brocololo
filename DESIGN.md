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

## Layout

Use the existing `page-container` and Tailwind spacing scale (one unit = 0.25rem), plus named spacing tokens above. Existing layouts use wrapping flex controls and responsive meal grids. Mobile navigation uses the sidebar sheet; desktop supports expanded and icon-only navigation.

Meal Plan and Log are peer destinations. Meal Plan owns household meal editing, dates, deletion, and grocery generation. Log owns person/day selection and actual intake. Both retain plan switching. Breadcrumbs identify the destination; omit duplicate page titles, descriptions, and counterpart buttons. Use the sidebar to move between destinations. Do not duplicate navigation as Manage/Track tabs.

Meal Plan's cooking checklist sits above the unchanged daily planner. Group unique meals under Breakfast, Lunch, and Dinner, with three columns on desktop and stacked groups on mobile. Rows contain only a Checkbox, small thumbnail, meal name, and planned-slot count. Group counts show unique meals left to cook; partially checked meals count until all matching slots are checked. Omit an overall heading, progress count, helper text, row subtitles, and Reset/Hide controls. Checking a row updates all matching slots in the current plan; partial completion uses an indeterminate checkbox. Checked rows stay in place with muted text and grayscale thumbnails. Reuse the existing daily-card checked state without changing card markup or styling.

## Elevation & Depth

Preserve existing `shadow-xs` and rose-tinted `shadow-rose-sm/md/lg/xl` tokens from `app/globals.css`. Do not add decorative elevation to page headers.

## Shapes

Use existing radius tokens and primitive defaults. Cards and dialogs use the existing rounded and bordered surface language.

## Components

- `components/ui/`: immutable base primitives, including Sidebar, Button, Select, Tabs, AlertDialog, Skeleton, and Breadcrumbs.
- `AppSidebar`: shared navigation with one active peer destination and mobile dismissal on selection.
- `PlanSwitcherSelect`: existing breadcrumb or in-page plan switching.
- `PlanEditor`: household meal arrangement and editing.
- `PlanMealChecklist`: grouped cooking checklist composing Checkbox, Label, and existing recipe-image handling; derived from the editor's live plan.
- `LogDayViewController`: day-first actual intake, with optional all-days view.
- `LogDayPersonToolbarControls`: existing date navigation and person selection.
- `PlanCurrentEmpty`: actionable no-plan state reused for Meal Plan, Log, and Groceries.
- `TopbarConfigController`: contextual breadcrumbs and actions.

Reuse these components; compose primitives rather than modifying `components/ui/`. Preserve their hover, focus, disabled, loading, and error patterns. Display saving feedback next to the page task.

## Do's and Don'ts

- Keep planning and recorded intake distinguishable by headings and controls, not a new palette.
- Keep plan-management and destructive actions on Meal Plan, not Log.
- Preserve existing data, grocery behavior, and old saved links.
- Keep toolbar controls wrapping on mobile and keyboard accessible.
- Do not add arbitrary pixel values, new fonts, or near-duplicate components.

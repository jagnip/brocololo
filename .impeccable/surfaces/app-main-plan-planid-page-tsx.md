---
version: 1
slug: "app-main-plan-planid-page-tsx"
primary_target: "app/(main)/plan/[planId]/page.tsx"
related_targets: ["app/(main)/log/plan/[planId]/page.tsx"]
---

# Meal Plan and Log

Mode: Operate. Scope: existing household planning and person/day logging surfaces.

## Direction contract

THESIS: Separate intention from actual intake. Two peer destinations replace nested navigation and redundant Manage/Track tabs.

OWN-WORLD: Preserve the existing rose/slate semantic palette, Quicksand/Geist typography, sidebar, breadcrumb switcher, buttons, and meal editors. No new visual identity or custom component family.

STORY: Arrange household meals in Meal Plan, generate groceries there, then record a person's actual intake in Log. Each page links to its counterpart for the same plan.

FIRST VIEWPORT: Contextual plan switcher in the top bar; task heading and short description in the content. Log puts wrapping day/person filters and the day/all-days switch above actual intake. Meal Plan presents the existing meal editor, with management actions in its top bar. Saving feedback stays visible.

FORM: Direct restructuring of existing surfaces, explicitly confirmed by the user. No concept seed applies to this scoped, established-world extension.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Boundaries

Preserve shared plans, saved data, household audience, plan switching, grocery generation, and existing styling. Existing tracking links redirect to Log. Independent logging without a plan and a replacement visual identity are out of scope.

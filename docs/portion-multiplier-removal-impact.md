# Portion multiplier removal — production impact

_Source: production database, queried 2026-07-14._

This document lists recipes that will behave differently after removing per-member portion multipliers. All shared-ingredient splits will become **equal** (50/50 for two-person recipes) instead of weighted by multiplier.

Related plan: remove `recipe_member_portions` table and multiplier UI; see `.todo` item “remove member's portion multiplier”.

---

## Summary

| Metric | Count |
|--------|------:|
| Recipes with any `recipe_member_portions` rows | 56 |
| Recipes with **non-default** multiplier (≠ 1) | **8** |
| Total portion rows in DB | 92 |
| Non-default portion rows | 8 |
| Affected user accounts | 1 (`gniadek.jagoda@gmail.com`) |

**Decision:** drop multiplier data silently; no auto-migration to `memberAdjustments`.

---

## What changes for affected recipes

Today, shared ingredients (“everyone” rows) are split by **multiplier weight**, not equally:

| Recipe pattern | Current split (shared ingredients) | After removal |
|----------------|-----------------------------------|---------------|
| Jagoda = 1 (implicit), Nelson = 2 | Jagoda **33%**, Nelson **67%** | **50% / 50%** |
| Jagoda = 1 (implicit), Nelson = 1.5 | Jagoda **40%**, Nelson **60%** | **50% / 50%** |

**Unchanged:**

- Recipe batch size (`servings`) and ingredient amounts on the recipe page
- Per-ingredient `memberAdjustments` (SKIP / MODIFY) — these override split math
- Planner meal counts (already ignore multipliers)
- Groceries / shopping quantities

**Note:** The account holder (Jagoda) never has a stored portion row — multiplier 1 is implicit. Only non-self members appear in `recipe_member_portions`.

---

## Affected recipes (8)

All belong to **gniadek.jagoda@gmail.com**. Audience is always **Jagoda + Nelson**.

| Recipe | Slug | Servings | Nelson multiplier | Shared split today → after | Ingredients | Existing `memberAdjustments` |
|--------|------|----------|-------------------|----------------------------|-------------|------------------------------|
| Caesar wrap | `caesar-wrap` | 2 | 2 | 33/67 → **50/50** | 10 | 2 SKIP (Jagoda: Caesar sauce, Parmesan) |
| Caprese sandwich | `caprese-sandwich` | 2 | 2 | 33/67 → **50/50** | 4 | none |
| Chili con carne | `chili-con-carne` | 2 | 2 | 33/67 → **50/50** | 16 | none |
| Culturally appropriated eggs | `culturally-appropriated-eggs` | 2 | 2 | 33/67 → **50/50** | 6 | none |
| Honey mustard wrap | `honey-mustard-wrap` | 2 | 2 | 33/67 → **50/50** | 11 | 1 SKIP (Jagoda: Cheddar) |
| Macedónia chicken traybake | `macedonia-chicken-traybake` | 2 | 2 | 33/67 → **50/50** | 3 | 1 MODIFY (Jagoda: chicken piece) |
| Miso salmon | `miso-salmon` | 2 | 2 | 33/67 → **50/50** | 3 | none |
| Pizza Vito Lacopelli | `pizza-vito-lacopelli` | 12 | 1.5 | 40/60 → **50/50** | 7 | none |

### Detail per recipe

#### Caesar wrap (`caesar-wrap`)

- **Portion row:** Nelson = 2
- **Impact:** Nutrition and add-to-log amounts for **shared** ingredients shift from 1:2 to 1:1.
- **Mitigation already in place:** Jagoda SKIP on Caesar sauce and Parmesan — those rows were never split by multiplier anyway.

#### Caprese sandwich (`caprese-sandwich`)

- **Portion row:** Nelson = 2
- **Impact:** All shared ingredients move from 33/67 to 50/50 split.

#### Chili con carne (`chili-con-carne`)

- **Portion row:** Nelson = 2
- **Servings:** 8 (4 meals for two people)
- **Impact:** Per-meal nutrition for shared ingredients equalizes.

#### Culturally appropriated eggs (`culturally-appropriated-eggs`)

- **Portion row:** Nelson = 2
- **Impact:** All shared ingredients move from 33/67 to 50/50 split.

#### Honey mustard wrap (`honey-mustard-wrap`)

- **Portion row:** Nelson = 2
- **Impact:** Shared ingredients equalize; Jagoda SKIP on Cheddar unchanged.

#### Macedónia chicken traybake (`macedonia-chicken-traybake`)

- **Portion row:** Nelson = 2
- **Impact:** Shared ingredients equalize; Jagoda MODIFY on chicken uses explicit amount (unchanged).

#### Miso salmon (`miso-salmon`)

- **Portion row:** Nelson = 2
- **Impact:** All shared ingredients move from 33/67 to 50/50 split.

#### Pizza Vito Lacopelli (`pizza-vito-lacopelli`)

- **Portion row:** Nelson = 1.5 (only stored row; Jagoda implicit 1)
- **Servings:** 12 (6 meals for two people)
- **Impact:** Shared ingredients move from 40/60 to 50/50 split.

---

## Unaffected recipes (48)

48 recipes have `recipe_member_portions` rows where **every stored multiplier is 1**. After removal, behavior is identical (equal split). No user-visible change.

---

## Recipes with no portion rows

Recipes with a single audience member, or created before the family-member model, may have **zero** rows in `recipe_member_portions`. These already behave as equal split (single person gets 100%).

---

## Post-removal gap

Until per-ingredient `memberAdjustments` nutrition is fully wired, the only way to model uneven portions will be explicit MODIFY amounts per ingredient — not a global recipe-level multiplier. For the 6 affected recipes with no adjustments, nutrition will temporarily assume equal appetite on all shared ingredients.

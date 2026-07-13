# Person-specific ingredients migration inventory (production)

_Source: production database only._

## Auto-migration rule

1. **Nelson + Jagoda pair** → Nelson = default base; Jagoda row dropped → MODIFY adjustment.
2. **Nelson-only** → default base; SKIP for others in audience.
3. **Jagoda-only / multi-target** → TODO (edit manually below).

MODIFY amounts stored per-person = `batchAmount / servings`.

## Production database

Recipes with person-specific rows: **22**

### Autumn chicken traybake
- **Slug:** `autumn-chicken-traybake`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 10 total (8 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Chicken thighs / skinless, bone-in | 1 | piece | Jagoda | `cmmi446tx0029kfm7k1qir94s` |
| 2 | Chicken thights / skin-on, bone-in | 2 | piece | Nelson | `cmmqjw0s2000e2im749e0w2qj` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Chicken thights / skin-on, bone-in (2 piece) → Jagoda MODIFY Chicken thighs / skinless, bone-in (0.5/person); drop row cmmi446tx0029kfm7k1qir94s |

#### Your manual overrides

```text
Jagoda's override -  1 Chicken thights / skin-on, bone-in to 1 Chicken thighs / skinless, bone-in 
```

---

### Avocado on toast
- **Slug:** `avocado-on-toast`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 4 total (3 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Egg white | 1 | piece | Jagoda | `cmnm194x4000ioijjq15o7dz6` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| TODO | jagoda_only | Egg white (1 piece) row `cmnm194x4000ioijjq15o7dz6` |

#### Your manual overrides

```text
Drop it 
```

---

### Bacalhau sem natas
- **Slug:** `bacalhau-sem-natas`
- **Servings:** 4 | **Audience:** Jagoda, Nelson
- **Rows:** 10 total (9 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Cheddar | 20 | g | Nelson | `cmqwybbc9000b04lbxqs1rsn7` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Bolognese
- **Slug:** `bolognese`
- **Servings:** 8 | **Audience:** Nelson, Jagoda
- **Rows:** 14 total (8 shared, 6 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Chicken mince | 400 | g | Jagoda | `cmmtgcwoc000904jriar73frf` |
| 2 | Spaghetti pasta | 320 | g | Nelson | `cmmtgcwt2000l04jr3jecez69` |
| 3 | Beef mince | 400 | g | Nelson | `cmmtgcwor000a04jrc0w0e40d` |
| 4 | Penne pasta / whole wheat | 160 | g | Jagoda | `cmmtgcwtg000m04jry9vnp9em` |
| 5 | Pancetta | 200 | g | Nelson | `cmmtgcwqc000e04jrk93z72cd` |
| 6 | Parmesan | 100 | g | Nelson | `cmmtgcwri000h04jrnxq3t7g9` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| TODO | jagoda_only | Chicken mince (400 g) row `cmmtgcwoc000904jriar73frf` |
| AUTO | nelson_exclusive | Default: Spaghetti pasta; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Beef mince; SKIP Jagoda |
| TODO | jagoda_only | Penne pasta / whole wheat (160 g) row `cmmtgcwtg000m04jry9vnp9em` |
| AUTO | nelson_exclusive | Default: Pancetta; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Parmesan; SKIP Jagoda |

#### Your manual overrides

```text
ALl good except Beef mince should be a default 800g but it should be substituted for Jagoda with chicken mince, The same spaghetti pasta is the default and JAgoda's poortion is substituted with whole wheat pasta

```

---

### Caesar wrap
- **Slug:** `caesar-wrap`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 10 total (8 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Parmesan | 20 | g | Nelson | `cmm9egj6k0004fam7s4i9seyz` |
| 2 | Caesar sauce | 2 | tbsp | Nelson | `cmm9egj9w0005fam7qnsktji5` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Parmesan; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Caesar sauce; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Chicken and tarragon casserole
- **Slug:** `chicken-and-tarragon-casserole`
- **Servings:** 6 | **Audience:** Nelson, Jagoda
- **Rows:** 18 total (13 shared, 5 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Chicken thighs / skinless, bone-in | 3 | piece | Jagoda | `cmms0e5py000304la4l45gtcw` |
| 2 | Chicken thighs / skinless, bone-in | 6 | piece | Nelson | `cmmszbpwy00031wttm0ilwa49` |
| 3 | Chicken stock / cubes | 1.5 | l | Nelson | `cmmmb1gbf0057c8m7tsfn5uf7` |
| 4 | Creme fraiche | 2 | tbsp | Nelson | `cmmmb1gte005cc8m7041k6eem` |
| 5 | Dijon mustard | 2 | tbsp | Nelson | `cmmmb1gww005dc8m7au082d7u` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Chicken thighs / skinless, bone-in (6 piece) → Jagoda MODIFY Chicken thighs / skinless, bone-in (0.5/person); drop row cmms0e5py000304la4l45gtcw |
| AUTO | nelson_exclusive | Default: Chicken stock / cubes; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Creme fraiche; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Dijon mustard; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Chicken soup
- **Slug:** `chicken-soup`
- **Servings:** 6 | **Audience:** Nelson, Jagoda
- **Rows:** 7 total (5 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Pevide pasta | 240 | g | Nelson | `cmmqkuxhs002o2im7lkhkw9ux` |
| 2 | Penne pasta / whole wheat | 90 | g | Jagoda | `cmmqkuydy002p2im7y75sgvnt` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Pevide pasta; SKIP Jagoda |
| TODO | jagoda_only | Penne pasta / whole wheat (90 g) row `cmmqkuydy002p2im7y75sgvnt` |

#### Your manual overrides

```text
DEfault pevide pasta, substitution for JAgoda whole wheat pasta
```

---

### Cranberry chicken sandwich
- **Slug:** `cranberry-chicken-sandwich`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 8 total (6 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Cheddar | 20 | g | Nelson | `cmmaja6qx001hudm79dqeuzqf` |
| 2 | Mayonnaise | 2 | tbsp | Nelson | `cmmaja6dk001dudm7u90j76r9` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Mayonnaise; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Honey mustard wrap
- **Slug:** `honey-mustard-wrap`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 11 total (10 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Cheddar | 20 | g | Nelson | `cmmjgnqys001vpjm7mchonmd3` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Kotlets
- **Slug:** `kotlets`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 8 total (4 shared, 4 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Chicken breast | 100 | g | Jagoda | `cmmi3jpiw001ikfm7k0hf6u8g` |
| 2 | Pork chops | 1 | piece | Nelson | `cmmth2p6f000204i5t5nsjd93` |
| 3 | Rapeseed oil | 2 | tbsp | Nelson | `cmmi3jpx0001mkfm7ljrlxqmm` |
| 4 | Olive oil | 1 | tsp | Jagoda | `cmmth3mi6000104jmjia58kyy` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| TODO | jagoda_only | Chicken breast (100 g) row `cmmi3jpiw001ikfm7k0hf6u8g` |
| AUTO | nelson_exclusive | Default: Pork chops; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Rapeseed oil; SKIP Jagoda |
| TODO | jagoda_only | Olive oil (1 tsp) row `cmmth3mi6000104jmjia58kyy` |

#### Your manual overrides

```text
Pork chops default, chicken breast subsitution sub for Jagoda
Rapeseed oil default, olive oil sub for Jagoda
```

---

### Macedónia chicken traybake
- **Slug:** `macedonia-chicken-traybake`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 4 total (2 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Chicken thighs / skinless, bone-in | 1 | piece | Jagoda | `cmmi3t5d4001wkfm72c0c6bax` |
| 2 | Chicken thights / skin-on, bone-in | 1 | piece | Nelson | `cmmqkel6v001i2im785z1zm6x` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Chicken thights / skin-on, bone-in (1 piece) → Jagoda MODIFY Chicken thighs / skinless, bone-in (0.5/person); drop row cmmi3t5d4001wkfm72c0c6bax |

#### Your manual overrides

```text

```

---

### Massada de salmão
- **Slug:** `massada-de-salmao`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 7 total (4 shared, 3 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Olive oil | 1 | tsp | Nelson | `cmmp4oyen000bmwm7l5e7c0f9` |
| 2 | Penne pasta / whole wheat | 30 | g | Jagoda | `cmmp4oy7n0009mwm7x0mtsz3v` |
| 3 | Pevide pasta | 80 | g | Nelson | `cmmp4oyb5000amwm7we6kpqvu` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Olive oil; SKIP Jagoda |
| TODO | jagoda_only | Penne pasta / whole wheat (30 g) row `cmmp4oy7n0009mwm7x0mtsz3v` |
| AUTO | nelson_exclusive | Default: Pevide pasta; SKIP Jagoda |

#### Your manual overrides

```text
DEfault pevide pasta, sub for JAgoda whole wheat pasta
```

---

### Mushroom soup
- **Slug:** `mushroom-soup`
- **Servings:** 4 | **Audience:** Nelson, Jagoda
- **Rows:** 12 total (10 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Penne pasta / whole wheat | 80 | g | Jagoda | `cmmrztsf7000x04jgkmk3d2cr` |
| 2 | Pevide pasta | 160 | g | Nelson | `cmmrztsfk000y04jgreoikdof` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| TODO | jagoda_only | Penne pasta / whole wheat (80 g) row `cmmrztsf7000x04jgkmk3d2cr` |
| AUTO | nelson_exclusive | Default: Pevide pasta; SKIP Jagoda |

#### Your manual overrides

```text
DEfault pevide pasta, sub for JAgoda whole wheat pasta
```

---

### Omelette banh mi
- **Slug:** `omelette-banh-mi`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 12 total (8 shared, 4 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Egg / L | 2 | piece | Jagoda | `cmmrwhm20000804jor9h6jcoj` |
| 2 | Egg / L | 4 | piece | Nelson | `cmn8y9y4i000304l4toej731c` |
| 3 | Butter | 1 | tsp | Nelson | `cmmrwhm58000g04joz24eooum` |
| 4 | Sesame oil | 0.5 | tsp | Jagoda | `cmn8w48fn000304jov0iqwd3w` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Egg / L (4 piece) → Jagoda MODIFY Egg / L (1/person); drop row cmmrwhm20000804jor9h6jcoj |
| AUTO | nelson_exclusive | Default: Butter; SKIP Jagoda |
| TODO | jagoda_only | Sesame oil (0.5 tsp) row `cmn8w48fn000304jov0iqwd3w` |

#### Your manual overrides

```text
Default butter, sesame oil sub for Jagoda
```

---

### Pizza Supreme
- **Slug:** `pizza-supreme`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 10 total (9 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Pepperoni ham | 50 | g | Nelson | `cmmmbftvc005zc8m791lglxdt` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Pepperoni ham; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Pork & pea stir fry (kam heong)
- **Slug:** `pork-and-pea-stir-fry-kam-heong`
- **Servings:** 6 | **Audience:** Nelson, Jagoda
- **Rows:** 11 total (7 shared, 4 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Pork mince | 400 | g | Nelson | `cmmtfv7xr000504jm8byosirr` |
| 2 | Chicken mince | 400 | g | Jagoda | `cmmtfv7yp000604jmlo2gg8z6` |
| 3 | Piri-piri sauce | 10 | drop | Nelson | `cmmtfv80e000a04jmj0s8ffdg` |
| 4 | Olive oil | 1 | tsp | Jagoda | `cmmtfx6nz000304jrrx3c3oud` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Pork mince; SKIP Jagoda |
| TODO | jagoda_only | Chicken mince (400 g) row `cmmtfv7yp000604jmlo2gg8z6` |
| AUTO | nelson_exclusive | Default: Piri-piri sauce; SKIP Jagoda |
| TODO | jagoda_only | Olive oil (1 tsp) row `cmmtfx6nz000304jrrx3c3oud` |

#### Your manual overrides

```text
Pork mince default, chicken mince usb for Jagododa
```

---

### Protein flatbread
- **Slug:** `protein-flatbread`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 4 total (3 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Cheddar | 20 | g | Nelson | `cmmrx69t5000504kzyd9mqq6v` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Ray fish caldeirada
- **Slug:** `ray-fish-caldeirada`
- **Servings:** 4 | **Audience:** Nelson, Jagoda
- **Rows:** 12 total (11 shared, 1 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Bread | 4 | slice | Nelson | `cmmp5avrr000ymwm7xsr46zmx` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Bread; SKIP Jagoda |

#### Your manual overrides

```text

```

---

### Russian salad
- **Slug:** `russian-salad`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 6 total (2 shared, 4 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Tuna in brine | 85 | g | Jagoda | `cmmmcauhi006mc8m7dvkkvirt` |
| 2 | Tuna in oil | 85 | g | Nelson | `cmmmcaul8006nc8m75efq6u2z` |
| 3 | Mayonnaise | 3 | tbsp | Nelson | `cmmmcauop006oc8m7rgxvs2ha` |
| 4 | Greek yogurt / light | 3 | tbsp | Jagoda | `cmmmcaus7006pc8m7qr2fta4e` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Tuna in oil (85 g) → Jagoda MODIFY Tuna in brine (42.5/person); drop row cmmmcauhi006mc8m7dvkkvirt |
| AUTO | nelson_exclusive | Default: Mayonnaise; SKIP Jagoda |
| TODO | jagoda_only | Greek yogurt / light (3 tbsp) row `cmmmcaus7006pc8m7qr2fta4e` |

#### Your manual overrides

```text
Her portion should be also 85g? Not 42.5/person
Mayo default, Greek yogurt sub for Jagoda
```

---

### Tuna & corn baked potatoes
- **Slug:** `tuna-and-corn-baked-potatoes`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 7 total (2 shared, 5 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Tuna in brine | 140 | g | Jagoda | `cmmqvm4zz0004b6m7gizwgu8g` |
| 2 | Tuna in oil | 140 | g | Nelson | `cmmqvm53g0005b6m7s381ou7f` |
| 3 | Greek yogurt / light | 1 | tbsp | Jagoda | `cmmqvm56x0006b6m7x4p1b3xy` |
| 4 | Mayonnaise | 2 | tbsp | Nelson | `cmmqvm5ad0007b6m7e83iaecr` |
| 5 | Cheddar | 30 | g | Nelson | `cmmqvm5ha0009b6m792l27q7m` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Tuna in oil (140 g) → Jagoda MODIFY Tuna in brine (70/person); drop row cmmqvm4zz0004b6m7gizwgu8g |
| TODO | jagoda_only | Greek yogurt / light (1 tbsp) row `cmmqvm56x0006b6m7x4p1b3xy` |
| AUTO | nelson_exclusive | Default: Mayonnaise; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text
Default mayo, sub for Jagoda greek yogurt
```

---

### Tuna sandwich bake
- **Slug:** `tuna-sandwich-bake`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 13 total (10 shared, 3 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Tuna in brine | 85 | g | Jagoda | `cmmmc4ta4006bc8m729235l79` |
| 2 | Tuna in oil | 85 | g | Nelson | `cmmmc4tdk006cc8m73u8jxm5d` |
| 3 | Cheddar | 20 | g | Nelson | `cmqzn99fz000104jpk5ilszoa` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | merge_pair | Default: Tuna in oil (85 g) → Jagoda MODIFY Tuna in brine (42.5/person); drop row cmmmc4ta4006bc8m729235l79 |
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text
Tuna in brine 85g is sub for Jagoda
```

---

### Veg casserole
- **Slug:** `veg-casserole`
- **Servings:** 2 | **Audience:** Nelson, Jagoda
- **Rows:** 10 total (8 shared, 2 targeted)

#### Current targeted rows

| # | Ingredient | Batch | Unit | Only for | Row ID |
|---|------------|-------|------|----------|--------|
| 1 | Single cream / light | 100 | g | Nelson | `cmmrxhlxy000604l5ywmg7j7p` |
| 2 | Cheddar | 100 | g | Nelson | `cmmrxhlzb000904l5scj1caxv` |

#### Proposed migration

| Status | Type | Details |
|--------|------|---------|
| AUTO | nelson_exclusive | Default: Single cream / light; SKIP Jagoda |
| AUTO | nelson_exclusive | Default: Cheddar; SKIP Jagoda |

#### Your manual overrides

```text
SIgnel cream is default, sub for Jagoda is light greek yogurt
```

---


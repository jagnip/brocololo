import { GroceryItem } from "@/types/groceries";
import { formatAmount } from "@/lib/groceries/helpers";
import { IngredientIcon } from "../ingredient-icon";

export function GroceriesView({ ingredients }: { ingredients: GroceryItem[] }) {
  if (ingredients.length === 0) {
    return (
      <p className="text-muted-foreground">No ingredients for selected days.</p>
    );
  }

  const grouped = Map.groupBy(ingredients, (item) => item.categoryName);
  const sortedCategories = [...grouped.entries()].sort(
    (a, b) => a[1][0].categorySortOrder - b[1][0].categorySortOrder,
  );

  return (
    <div className="space-y-6">
      {sortedCategories.map(([categoryName, items]) => (
        <section key={categoryName}>
          <h2 className="text-lg font-semibold mb-2">{categoryName}</h2>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between border-b pb-2"
              >
                <div className="flex items-center gap-2">
                  <IngredientIcon
                    icon={item.ingredientIcon}
                    name={item.ingredientName}
                  />
                  <span className="font-medium">{item.ingredientName}</span>
                  <span className="text-sm text-muted-foreground">
                    ({item.recipeNames.join(", ")})
                  </span>
                </div>
                <span className="text-sm tabular-nums">
                  {item.amount !== null
                    ? `${formatAmount(item.amount)} ${item.unitName ?? ""}`.trim()
                    : item.unitName ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

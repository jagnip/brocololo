import MultipleSelector from "@/components/ui/multiselect";
import { CategoryType } from "@/types/category";

interface CategorySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  categories: CategoryType[];
}

export function CategorySelector({
  value,
  onChange,
  categories,
}: CategorySelectorProps) {
  return (
    <MultipleSelector
      value={
        // Transform string[] → Option[]
        value
          ? categories
              .filter((cat) => value.includes(cat.id))
              .map((cat) => ({
                value: cat.id,
                label: cat.name,
              }))
          : []
      }
      onChange={(options) => {
        // Transform Option[] → string[]
        onChange(options.map((option) => option.value));
      }}
      defaultOptions={categories.map((category) => ({
        value: category.id,
        label: category.name,
      }))}
      placeholder="Select categories"
      emptyIndicator={
        <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
          No results found.
        </p>
      }
    />
  );
}

export type RecipeType = {
  id: number;
  name: string;
  photo: string;
  instructions: string[];
  "hands-on-time": number;
  nutrition: string[];
  ingredients: string[];
  notes: string[];
  portions: number;
  categorySlugs: string[];
};


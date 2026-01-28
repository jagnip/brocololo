[
  {
    // Canonical ingredient name (single name only)
    name: "Apple",

    // Must match an existing ingredient category in DB
    category: "Produce",

    // Required nutrition fields in your schema (per 100g)
    nutritionPer100g: {
      calories: 52,
      proteins: 0.3,
      fats: 0.2,
      carbs: 14,
    },

    // Only units you actually use with this ingredient
    units: [
      { name: "g", gramsPerUnit: 1 },
      { name: "piece", gramsPerUnit: 180 }, // choose your standard apple size
    ],

    // IMPORTANT:
    // Store only filename from /public/icons/ingredients/
    // e.g. if file is public/icons/ingredients/apple.svg -> use "apple.svg"
    icon: "apple.svg",

    // Optional external product/reference link
    // Use full URL or null
    supermarketUrl: "https://www.continente.pt/produto/maca-gala-2000001.html",
  },
];
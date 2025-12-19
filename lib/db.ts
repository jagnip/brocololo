 const RECIPES_URL = "https://693ddb9df55f1be79303da63.mockapi.io";

export async function getRecipes() {
  const url = `${RECIPES_URL}/recipes`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch recipes. Response status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch recipes", (error as Error).message);
    return [];
  }
}

export async function getCategories() {
  const url = `${RECIPES_URL}/categories`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories. Response status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch categories", (error as Error).message);
    return [];
  }
}
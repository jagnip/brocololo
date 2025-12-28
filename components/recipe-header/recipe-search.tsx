import Form from "next/form";

export default function RecipeSearch() {
  return (
    <Form action="">
      <input
        autoComplete="off"
        id="search"
        name="q"
        placeholder="Search in task title or description..."
        type="search"
      />
    </Form>
  );
}

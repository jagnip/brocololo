import Form from "next/form";
import { Command, CommandInput } from "../ui/command";

export default function RecipeSearch() {
  return (
    <Form action="" className="flex items-center">
      <Command className="rounded-lg border md:min-w-[450px]">
        <CommandInput placeholder="Search recipe..." className="h-9" />
      </Command>
    </Form>
  );
}

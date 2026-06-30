/** Shown when every item is bought and hidden (Show completed is off). */
export function GroceriesAllDoneState() {
  return (
    <section className="mx-auto max-w-md space-y-2 rounded-xl border border-border bg-card p-8 text-center">
      <h2 className="type-h2 text-balance">You&apos;re all done!</h2>
      <p className="text-sm text-muted-foreground">
        Select Show to review what you bought.
      </p>
    </section>
  );
}

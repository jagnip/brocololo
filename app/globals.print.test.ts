import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { expect, it } from "vitest";

it("prints the full diary across multiple pages without app-shell clipping", async () => {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  const printCss = css.slice(css.lastIndexOf("@media print"));
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>
        .shell { display: flex; height: 100vh; overflow: hidden; }
        main { height: 100vh; overflow: auto; position: relative; }
        [data-log-food-diary] { display: none; }
        [data-log-summary-row] { padding: 20px; }
        @media print { [data-log-food-diary] { display: block; } }
        ${printCss}
      </style>
      <div class="shell">
        <aside>Navigation</aside>
        <main>
          <header>Toolbar</header>
          <article data-log-plan-summary>
            <h2>Daily breakdown</h2>
            <p>Summary table</p>
            <section data-log-food-diary>
              <h2 data-log-food-heading>Logged food and ingredients</h2>
              ${Array.from({ length: 100 }, (_, index) => `<p data-log-summary-row>Ingredient ${index + 1}: 100 g</p>`).join("")}
            </section>
          </article>
        </main>
      </div>
    `);
    await page.emulateMedia({ media: "print" });

    expect(await page.locator("aside").isVisible()).toBe(false);
    expect(await page.locator("header").isVisible()).toBe(false);
    expect(await page.getByText("Ingredient 100: 100 g").isVisible()).toBe(true);

    const pdf = await page.pdf({ format: "A4" });
    const pageCount = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    expect(pageCount).toBeGreaterThan(2);
  } finally {
    await browser.close();
  }
});

const assert = require("node:assert/strict");

module.exports = async function checkReadingProgress(browser, base, evidence) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const position = (node) =>
    Number(node.style.getPropertyValue("--reading-progress"));
  const toStep = async (root, index) => {
    const steps = root.locator("[data-reading-step]");
    await steps
      .nth(index)
      .evaluate((node) =>
        scrollTo(0, scrollY + node.getBoundingClientRect().top - 180),
      );
    await page.waitForFunction(
      ({ selector, index }) => {
        const nodes = document.querySelectorAll(
          selector + " [data-reading-step]",
        );
        return nodes[index]?.getAttribute("aria-current") === "step";
      },
      {
        selector: await root
          .getAttribute("class")
          .then((c) => "." + c.split(" ")[0]),
        index,
      },
    );
    return steps;
  };
  try {
    await page.goto(base + "#/about");
    const timeline = page.locator(".about-timeline");
    await timeline.locator("[data-reading-step]").first().waitFor();
    const original = await page.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    await toStep(timeline, 0);
    const before = await timeline.evaluate(position);
    const height = await timeline.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    await page.mouse.wheel(0, 100);
    await page.waitForFunction(
      (value) =>
        Number(
          document
            .querySelector(".about-timeline")
            .style.getPropertyValue("--reading-progress"),
        ) > value,
      before,
    );
    const afterHeight = await timeline.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    // DOMRect rounding can vary with scroll offset below Chromium's 1/64px layout unit.
    assert.ok(
      Math.abs(afterHeight - height) < 1 / 64,
      "progress does not resize content",
    );
    await toStep(timeline, 2);
    await toStep(timeline, 1);
    await page.screenshot({ path: evidence + "/reading-about.png" });
    assert.ok(
      (
        await timeline
          .locator("p,h2")
          .evaluateAll((nodes) =>
            nodes.map((n) => Number(getComputedStyle(n).opacity)),
          )
      ).every((value) => value === 1),
      "all text stays readable, including inactive stages",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document.querySelector(".about-timeline").dataset.readingMotion ===
        "off",
    );
    assert.equal(
      await timeline.locator(".reading-progress-dot").isVisible(),
      false,
    );
    const offset = (node) =>
      Number.parseFloat(node.style.getPropertyValue("--reading-offset"));
    const quiet = await timeline.evaluate(offset);
    await page.mouse.wheel(0, 20);
    await page.waitForTimeout(100);
    assert.ok(
      Math.abs((await timeline.evaluate(offset)) - quiet) < 1 / 64,
      "reduced motion keeps discrete stage feedback",
    );
    await toStep(timeline, 2);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.goto(base + "#/home");
    await page
      .getByRole("button", { name: "움직임 멈추기", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page.goto(base + "#/about");
    await page.waitForFunction(
      () =>
        document.querySelector(".about-timeline")?.dataset.readingMotion ===
        "off",
    );
    assert.equal(
      await timeline.locator(".reading-progress-dot").isVisible(),
      false,
      "pause persists across routes and reload",
    );
    await page.goto(base + "#/home");
    await page
      .getByRole("button", { name: "움직임 재생", exact: true })
      .filter({ visible: true })
      .first()
      .click();

    await page.goto(base + "#/projects/proj-crossroads-ai-verdict");
    const making = page.locator(".project-making");
    await making.locator("[data-reading-step]").first().waitFor();
    await toStep(making, 1);
    await toStep(making, 0);
    assert.equal(await making.locator('[aria-current="step"]').count(), 1);
    await page.screenshot({ path: evidence + "/reading-making.png" });
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      ),
      original,
      "reading progress never writes project data",
    );

    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + "#/about");
      await timeline.locator("[data-reading-step]").first().waitFor();
      await toStep(timeline, 1);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        width + ": no horizontal overflow",
      );
      await page.waitForTimeout(600);
      await page.screenshot({ path: evidence + "/reading-" + width + ".png" });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: reversible reading rails, fully readable text, stable layout, reduced/pause controls, unchanged data and 320–1440px layouts.",
    );
  } finally {
    await page.close();
  }
};

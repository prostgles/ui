import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { expect, test } from "./fixtures";

test("Component previews preserve button heights and filter interactions", async ({
  page,
}) => {
  test.skip(!!process.env.ONLY_VIDEO, "Only recording videos");
  const configId = "component-list-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({ id: configId, tableConfig: {} }),
    logPath: test.info().outputPath("component-list-server.log"),
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(`${deployment.endpoint}/component-list`);
    await expect(page.locator("body")).toContainText(
      "All button heights match for loading state.",
    );

    /* Global controls update all previews; individual filters remain editable. */
    const filterExamples = page.locator("[data-filter-example]");
    await expect(filterExamples).toHaveCount(48);
    const expandedFilters = filterExamples.getByTestId("FilterWrapper");
    const conditionCount = await expandedFilters.count();
    expect(conditionCount).toBeGreaterThan(0);
    await expect(expandedFilters.first()).toHaveCSS("border-width", "1px");
    await expect(expandedFilters.first()).toHaveCSS("border-radius", "8px");

    /* Opening suggestions keeps the search input at the filter row's height. */
    const searchFilter = filterExamples
      .locator(".FilterWrapper.variant-row")
      .filter({ has: page.locator(".SmartSearch") })
      .first();
    const searchInput = searchFilter.getByTestId("SearchList.Input");
    const filterInputHeight = await searchFilter
      .locator(".FilterWrapper_Children")
      .evaluate((element) => getComputedStyle(element).height);
    await expect(searchInput).toHaveCSS("height", filterInputHeight);
    await searchInput.click();
    await expect(searchFilter.getByTestId("SearchList.List")).toBeVisible();
    await expect(searchInput).toHaveCSS("height", filterInputHeight);
    await page
      .getByTestId("ClickCatchOverlay")
      .click({ position: { x: 0, y: 0 } });
    await expect(searchFilter.getByTestId("SearchList.List")).toHaveCount(0);
    await expect(searchInput).toHaveCSS("height", filterInputHeight);

    /* Expanded lists stay flush; range inputs wrap only when space is limited. */
    const listFilter = page.locator('[data-filter-example="Long list"]');
    const firstListItem = listFilter.getByRole("option").first();
    await expect(firstListItem).toHaveCSS("border-radius", "0px");
    await expect(firstListItem.locator(".LABELWRAPPER span")).toHaveCSS(
      "font-size",
      "14px",
    );
    await expect(listFilter.locator(".ListFilter")).toHaveCSS("margin", "0px");
    await expect(listFilter.locator(".SearchList_InputWrapper")).toHaveCSS(
      "border-radius",
      "0px",
    );

    /* Toggle-all icons describe the action; unchecked filter rows are muted. */
    const toggleAll = listFilter.getByTestId("SearchList.toggleAll");
    const checkedListItems = listFilter.locator(
      '[role="option"] input:checked',
    );
    await expect(toggleAll).toHaveAttribute("title", "Deselect all");
    const deselectAllIcon = await toggleAll.locator("path").getAttribute("d");
    await firstListItem.click();
    await expect(checkedListItems).toHaveCount(5);
    await expect(firstListItem.locator(".ROWINNER")).toHaveCSS(
      "opacity",
      "0.75",
    );
    await expect(toggleAll).toHaveAttribute("title", "Select all");
    await expect(toggleAll.locator("path")).not.toHaveAttribute(
      "d",
      deselectAllIcon!,
    );
    const selectAllIcon = await toggleAll.locator("path").getAttribute("d");
    await toggleAll.click();
    await expect(checkedListItems).toHaveCount(6);
    await expect(firstListItem.locator(".ROWINNER")).toHaveCSS("opacity", "1");
    await expect(toggleAll.locator("path")).toHaveAttribute(
      "d",
      deselectAllIcon!,
    );
    await toggleAll.click();
    await expect(checkedListItems).toHaveCount(0);
    await expect(listFilter.getByTestId("FilterWrapper")).not.toHaveAttribute(
      "data-filter-disabled",
    );
    await expect(listFilter.getByTestId("SearchList.Input")).toBeFocused();
    await expect(toggleAll).toHaveAttribute("title", "Select all");
    await expect(toggleAll.locator("path")).toHaveAttribute(
      "d",
      selectAllIcon!,
    );
    await toggleAll.click();
    await expect(checkedListItems).toHaveCount(6);

    /* New list filters and clearing their final value keep the input active. */
    const joinedExample = page.locator(
      '[data-filter-example="$existsJoined · single condition"]',
    );
    const singleJoinedFilter = joinedExample.getByTestId("FilterWrapper");
    const joinedFilterActions = singleJoinedFilter.locator(
      ".PopupMenu_triggerWrapper",
    );
    await page.getByRole("heading").first().hover();
    await expect(joinedFilterActions).toHaveCSS("opacity", "0");
    await singleJoinedFilter.hover();
    await expect(joinedFilterActions).toHaveCSS("opacity", "1");
    await expect(joinedExample.getByTestId("JoinedFilterControl")).toHaveCount(
      0,
    );
    await expect(
      singleJoinedFilter.getByTestId("FilterWrapper_Field"),
    ).toHaveText("Examples.status");
    await singleJoinedFilter
      .locator("input[type=text]")
      .fill("Updated joined preview");
    await expect(singleJoinedFilter.locator("input[type=text]")).toHaveValue(
      "Updated joined preview",
    );
    await singleJoinedFilter.getByTestId("FilterWrapper.typeSelect").click();
    await page.locator('[role="option"][data-key="not null"]').click();
    await expect(
      singleJoinedFilter.getByTestId("FilterWrapper.typeSelect"),
    ).toHaveText("is not null");
    await singleJoinedFilter.getByTestId("FilterWrapper.typeSelect").click();
    await page.locator('[role="option"][data-key="="]').click();
    await joinedExample.getByTitle("Add condition or group").click();
    const addJoinedFilterMenu = page.getByTestId("Popup.content");
    await expect(addJoinedFilterMenu.getByRole("button")).toHaveCount(2);
    await addJoinedFilterMenu
      .getByTitle("Add condition", { exact: true })
      .click();
    await page
      .getByTestId("SmartAddFilter")
      .locator('[role="option"][data-key="status"]')
      .click();
    await expect(
      joinedExample.getByTestId("JoinedFilterControl"),
    ).toBeVisible();
    const addedListFilter = joinedExample.getByTestId("FilterWrapper").last();
    const addedListInput = addedListFilter.getByTestId("SearchList.Input");
    await expect(addedListFilter).not.toHaveAttribute("data-filter-disabled");
    await expect(addedListInput).toBeFocused();
    const addedListItem = addedListFilter.getByRole("option").first();
    await addedListItem.click();
    await expect(addedListItem.locator("input")).toBeChecked();
    await addedListItem.click();
    await expect(addedListItem.locator("input")).not.toBeChecked();
    await expect(addedListFilter).not.toHaveAttribute("data-filter-disabled");
    await expect(addedListInput).toBeFocused();
    await addedListFilter.getByTestId("FilterWrapper.deleteFilter").click();
    await expect(joinedExample.getByTestId("JoinedFilterControl")).toHaveCount(
      0,
    );
    await joinedExample.getByTitle("Add condition or group").click();
    await addJoinedFilterMenu.getByTitle("Add group", { exact: true }).click();
    await expect(joinedExample.getByTestId("GroupedFilterControl")).toHaveCount(
      2,
    );
    await joinedExample.getByTitle("Delete group", { exact: true }).click();
    await expect(joinedExample.getByTestId("JoinedFilterControl")).toHaveCount(
      0,
    );

    for (const label of [
      "amount · between ($between)",
      "Date range",
      "Timestamp range",
    ]) {
      const rangeFilter = page
        .locator(`[data-filter-example="${label}"]`)
        .getByTestId("FilterWrapper");
      const inputs = rangeFilter.locator("input");
      await expect(inputs).toHaveCount(2);
      await expect(inputs.first()).toHaveCSS("height", "30px");
      await expect
        .poll(() =>
          inputs.evaluateAll(
            ([min, max]) =>
              min?.getBoundingClientRect().top ===
              max?.getBoundingClientRect().top,
          ),
        )
        .toBe(true);
      await rangeFilter.evaluate((filter) => {
        filter.style.maxWidth = "200px";
      });
      await expect
        .poll(() =>
          inputs.evaluateAll(
            ([min, max]) =>
              !!min &&
              !!max &&
              min.getBoundingClientRect().bottom <=
                max.getBoundingClientRect().top,
          ),
        )
        .toBe(true);
      await rangeFilter.evaluate((filter) => {
        filter.style.maxWidth = "100%";
      });
    }
    const nestedGroup = page
      .locator('[data-filter-example="Nested groups"]')
      .getByTestId("GroupedFilterControl")
      .nth(1);
    await expect
      .poll(() =>
        nestedGroup.evaluate(
          (group) =>
            group.clientWidth <=
            Math.max(
              ...Array.from(
                group.children,
                (child) => child.getBoundingClientRect().width,
              ),
            ) +
              1,
        ),
      )
      .toBe(true);
    const nullFilter = page
      .locator('[data-filter-example="status · is null (null)"]')
      .getByTestId("FilterWrapper");
    await expect
      .poll(() =>
        nullFilter.evaluate(
          (filter) => filter.clientWidth < filter.parentElement!.clientWidth,
        ),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Minimise all", exact: true })
      .click();
    await expect(expandedFilters).toHaveCount(0);
    await expect(
      filterExamples.locator(".FilterWrapper_MinimisedRoot"),
    ).toHaveCount(conditionCount);
    await expect(
      filterExamples.locator(".FilterWrapper_MinimisedRoot").first(),
    ).toHaveCSS("border-width", "1px");
    await page.getByRole("button", { name: "Expand all", exact: true }).click();
    await expect(expandedFilters).toHaveCount(conditionCount);
    const textExample = page.locator(
      '[data-filter-example="status · ilike ($ilike)"]',
    );
    await textExample.locator("input[type=text]").fill("Updated preview");
    await expect(textExample.locator("input[type=text]")).toHaveValue(
      "Updated preview",
    );
    await expect(textExample.locator(".form-field")).toHaveCSS("opacity", "1");
    await textExample.getByTestId("FilterWrapper_Field").click();
    await expect(
      textExample.locator(".FilterWrapper_MinimisedRoot"),
    ).toContainText("Updated preview");
    await textExample.locator(".FilterWrapper_MinimisedRoot").click();
    await expect(textExample.getByTestId("FilterWrapper")).toBeVisible();
    await textExample
      .getByRole("button", { name: "Disable filter", exact: true })
      .click();
    await expect(
      textExample.getByRole("button", { name: "Enable filter", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset all", exact: true }).click();
    await expect(textExample.locator("input[type=text]")).toHaveValue("Active");
  } finally {
    await deployment.dispose();
  }
});

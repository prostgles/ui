import { getCommandElemSelector, getDataKey } from "Testing";
import {
  closeWorkspaceWindows,
  deleteAllWorkspaces,
  runDbsSql,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { clickTableRow } from "./table.svgif";

const linkedSortCol = "Orders (30d)";

export const tableTimechartSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, toggleMenuPinned, openMenuIfClosed },
  { addScene, addSceneAnimation },
) => {
  await openConnection("food_delivery");
  await deleteAllWorkspaces(page);
  await closeWorkspaceWindows(page);
  await toggleMenuPinned(false);

  await page.getByTestId("dashboard.menu").click();

  await openMenuIfClosed();
  await page
    .locator(
      getCommandElemSelector("dashboard.menu.tablesSearchList") +
        " " +
        getDataKey("restaurants"),
    )
    .click();

  await page.waitForTimeout(2000);
  const res = await runDbsSql(
    page,
    `
    UPDATE windows 
    SET columns = \${columns:json} 
    WHERE table_name = 'restaurants'
    RETURNING *;
    `,
    windowConfig,
    {
      returnType: "rows",
    },
  );
  if (!res || !res[0]) {
    throw "Failed to set window config";
  }

  await page.reload();
  await page.waitForTimeout(2000);

  /**  */
  // await page.getByTestId("AddColumnMenu").click();
  // await page
  //   .getByTestId("AddColumnMenu")
  //   .locator(getDataKey("Referenced"))
  //   .click();
  // await page
  //   .getByTestId("JoinPathSelectorV2")
  //   .locator(getDataKey("orders"))
  //   .click();
  // await page.getByTestId("QuickAddComputedColumn").click();
  // await page.locator(getDataKey("$countAll")).click();
  // await page.getByTestId("QuickAddComputedColumn.Add").click();
  // await page.locator("input#nested-col-name").fill("All orders");
  // await page.waitForTimeout(1500);
  // await page.getByTestId("LinkedColumn.Add").click();
  const toggleFixedLayout = async (on: boolean) => {
    await page.reload();
    const btn = await page.getByTestId(
      "WorkspaceMenu.toggleWorkspaceLayoutMode",
    );
    const isOn = Boolean((await btn.textContent())?.includes("Edit layout"));
    if (isOn !== on) {
      await btn.click();
    }
  };
  await toggleFixedLayout(true);

  await page.evaluate(() => {
    document.querySelector<HTMLDivElement>(".TopHeader")!.style.display =
      "none";
    [".Project", ".silver-grid-component", "body"].forEach((selector) => {
      document.querySelector<HTMLDivElement>(selector)!.style.background =
        "transparent";
    });
    document.querySelector<HTMLDivElement>(
      ".silver-grid-component",
    )!.style.padding = "0";
    document.querySelector<HTMLDivElement>(
      `[data-command="WorkspaceMenu.toggleWorkspaceLayoutMode"]`,
    )!.style.opacity = "0";
  });

  /** Show linked computed column */
  await addSceneAnimation(getCommandElemSelector("AddColumnMenu"));

  await addSceneAnimation(
    getCommandElemSelector("AddColumnMenu") + " " + getDataKey("Referenced"),
    {
      duration: "fast",
    },
  );

  await addSceneAnimation(
    getCommandElemSelector("JoinPathSelectorV2") + " " + getDataKey("orders"),
    {
      duration: "fast",
    },
  );

  await addSceneAnimation(getCommandElemSelector("NestedTimechartControls"), {
    duration: "fast",
  });
  await page.keyboard.press("Escape");
  await addSceneAnimation(getCommandElemSelector("LinkedColumn.Add"), {
    duration: "fast",
  });

  await page.locator(getDataKey(linkedSortCol)).click();
  await page.waitForTimeout(500);
  await addSceneAnimation(getDataKey(linkedSortCol));
  await page.waitForTimeout(1500);

  await addScene();
  await toggleFixedLayout(false);

  await page.waitForTimeout(2000);

  /** Add map */
  await page.getByTestId("AddChartMenu.Map").click();
  await page.locator(getDataKey("orders > customers.geog")).click();
  await page.getByTestId("DataLayerDataSourceInfo").click();
  await page.locator(getDataKey("addresses.geog")).click();

  await toggleFixedLayout(true);

  await clickTableRow({ page, addScene, addSceneAnimation }, 2, undefined, 2);
  await page.waitForTimeout(2_000);
  await clickTableRow({ page, addScene, addSceneAnimation }, 3, undefined, 2);
  await addScene({
    svgFileName: "linked_data_map",
    animations: [{ type: "wait", duration: 2000 }],
  });
  await clickTableRow({ page, addScene, addSceneAnimation }, 3, undefined, 1);

  await addSceneAnimation(
    getCommandElemSelector("JoinedRecords.SectionToggle") +
      getDataKey("orders"),
  );
  await addScene({
    animations: [{ type: "wait", duration: 2000 }],
  });

  await toggleFixedLayout(false);
};

const windowConfig = {
  sort: [
    {
      key: [linkedSortCol, "COUNT ALL"].join("."),
      asc: false,
      nulls: "last",
    },
  ],
  columns: [
    {
      name: linkedSortCol,
      show: true,
      width: 140,
      style: {
        barColor: "var(--active)",
        textColor: "#646464",
        type: "Barchart",
      },
      nested: {
        path: [
          {
            on: [
              {
                id: "restaurant_id",
              },
            ],
            table: "orders",
          },
        ],
        limit: 20,
        columns: [
          {
            computedConfig: {
              funcDef: {
                key: "$countAll",
                name: "COUNT ALL",
                label: "COUNT ALL",
                outType: {
                  udt_name: "int8",
                  tsDataType: "string",
                },
                subLabel: "Count of all rows",
                isAggregate: true,
                isAllowedForColumn: true,
              },
              udt_name: "int8",
              tsDataType: "string",
            },
            name: "COUNT ALL",
            show: true,
          },
          {
            name: "id",
            show: false,
          },
          {
            name: "restaurant_id",
            show: false,
          },
          {
            name: "customer_id",
            show: false,
          },
          {
            name: "customer_address_id",
            show: false,
          },
          {
            name: "deliverer_id",
            show: false,
          },
          {
            name: "status",
            show: false,
          },
          {
            name: "delivery_fee",
            show: false,
          },
          {
            name: "service_fee",
            show: false,
          },
          {
            name: "total_price",
            show: false,
          },
          {
            name: "created_at",
            show: false,
          },
          {
            name: "updated_at",
            show: false,
          },
        ],
        joinType: "left",
        displayMode: "no-headers",
        detailedFilter: [
          {
            type: "$ageNow",
            value: "30day",
            disabled: false,
            fieldName: "created_at",
            complexFilter: {
              type: "controlled",
              funcName: "$ageNow",
              comparator: "<",
              argsLeftToRight: false,
            },
          },
        ],
      },
    },
    {
      name: "name",
      show: true,
    },
    {
      name: "Hygiene rating",
      show: true,
      width: 120,
      style: {
        type: "Conditional",
        conditions: [
          {
            color: "#f6beff",
            operator: "=",
            chipColor: "#f6beff",
            condition: "0 - urgent improvement necessary",
            textColor: "#490063",
            borderColor: "rgb(172 64 211)",
            textColorDarkMode: "#c1ad10",
          },
          {
            color: "#f6beff",
            operator: "=",
            chipColor: "#f6beff",
            condition: "1 - major improvement necessary",
            textColor: "#490063",
            borderColor: "rgb(172 64 211)",
            textColorDarkMode: "#c1ad10",
          },
          {
            color: "#b4b4b42e",
            operator: "=",
            chipColor: "#b4b4b42e",
            condition: "AwaitingInspection",
            textColor: "#4b4b4b",
            textColorDarkMode: "#2386d5",
          },
          {
            color: "#c9e7ff7d",
            operator: "=",
            chipColor: "#c9e7ff7d",
            condition: "4 - generally satisfactory",
            textColor: "#0075d2",
            borderColor: "rgb(120 189 243)",
            textColorDarkMode: "#838181",
          },
          {
            color: "#b4b4b42e",
            operator: "=",
            chipColor: "#b4b4b42e",
            condition: "Exempt",
            textColor: "#4b4b4b",
            borderColor: "rgb(169 169 169)",
            textColorDarkMode: "#838181",
          },
          {
            color: "#d4b7002e",
            operator: "=",
            chipColor: "#d4b7002e",
            condition: "3 - improvement necessary",
            textColor: "#716400",
            borderColor: "rgb(227 217 41)",
            textColorDarkMode: "#a95cc5",
          },
          {
            operator: "=",
            chipColor: "#ffd0cd",
            condition: "2 - some improvement necessary",
            textColor: "#940000",
            borderColor: "rgb(216 71 71)",
          },
          {
            color: "#BEE8FF66",
            operator: "=",
            chipColor: "#BEE8FF66",
            condition: "4 - good",
            textColor: "#0B5FAE",
            borderColor: "#4A9DE6CC",
            textColorDarkMode: "#8EC8FF",
          },
          {
            color: "#39C56B55",
            operator: "=",
            chipColor: "#39C56B55",
            condition: "5 - very good",
            textColor: "#0D6B2E",
            borderColor: "#1F9A4CCC",
            textColorDarkMode: "#7BE3A0",
          },
        ],
      },
      nested: {
        path: [
          {
            on: [
              {
                id: "restaurant_id",
              },
            ],
            table: "hygiene_ratings",
          },
        ],
        limit: 20,
        columns: [
          {
            name: "id",
            show: false,
          },
          {
            name: "restaurant_id",
            show: false,
          },
          {
            name: "business_name",
            show: false,
          },
          {
            name: "rating_value",
            show: false,
          },
          {
            name: "rating_value_desc",
            show: true,
          },
          {
            name: "hygiene_score",
            show: false,
          },
          {
            name: "structural_score",
            show: false,
          },
          {
            name: "confidence_in_management_score",
            show: false,
          },
          {
            name: "rating_date",
            show: false,
          },
          {
            name: "fhrsid",
            show: false,
          },
          {
            name: "local_authority_name",
            show: false,
          },
          {
            name: "match_confidence",
            show: false,
          },
          {
            name: "match_method",
            show: false,
          },
          {
            name: "source_url",
            show: false,
          },
          {
            name: "fetched_at",
            show: false,
          },
          {
            name: "status",
            show: false,
          },
          {
            name: "error_message",
            show: false,
          },
          {
            name: "latitude",
            show: false,
          },
          {
            name: "longitude",
            show: false,
          },
          {
            name: "geog",
            show: false,
          },
          {
            name: "api_payload",
            show: false,
          },
        ],
        joinType: "inner",
      },
    },
    {
      format: {
        type: "Media",
        params: {
          type: "Fixed",
          fixedContentType: "image",
        },
      },
      name: "logo",
      show: true,
      width: 55,
    },
    {
      format: {
        type: "URL",
      },
      name: "website",
      show: true,
      width: 187,
    },
    {
      name: "type",
      show: true,
    },
    {
      name: "address",
      show: true,
    },
    {
      name: "address_id",
      show: true,
    },
    {
      name: "id",
      show: true,
    },
    {
      name: "created_at",
      show: true,
    },
  ],
};

import type { Locator, Page } from "@playwright/test";
import { createTestDeployment } from "../../server/dist/server/src/testing";
import { createConfigTestProject } from "./utils/createConfigTestProject";
import { expect, test } from "./utils/fixtures";
import {
  deleteAllWorkspaces,
  getDashboardUtils,
  openWorkspaceMenu,
  setOrAddWorkspace,
} from "./utils/utils";
import { toggleFixedLayout } from "./svgScreenshots/tableTimechart.svgif";

export const testWorkspaceSwitching = async (page: Page) => {
  const configId = "workspace-switching-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      tableConfig: {
        records: { columns: { id: "integer PRIMARY KEY" } },
      },
    }),
    logPath: test.info().outputPath("workspace-switching-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      await projectDatabase.query("INSERT INTO records VALUES (1)");
      await stateDatabase.query(`
        UPDATE users SET options = COALESCE(options, '{}'::jsonb)
          || '{"theme":"light","pinnedMenu":false,"pinnedMenuWidth":360}'::jsonb
        WHERE username = 'admin';
        INSERT INTO workspaces (name, user_id, connection_id, last_updated, published, options)
        SELECT workspace.name, users.id, connections.id, 1, workspace.name = 'Second workspace', '{}'::jsonb
        FROM users, connections,
          (VALUES ('First workspace'), ('Second workspace'), ('Empty workspace')) AS workspace(name)
        WHERE users.username = 'admin' AND connections.name = '${configId}';
        INSERT INTO windows (workspace_id, user_id, type, table_name, name, last_updated)
        SELECT id, user_id, 'table', 'records', name, 1 FROM workspaces
        WHERE name IN ('First workspace', 'Second workspace');
      `);
    },
  });
  try {
    const { db } = await deployment.connectStateAs("admin");
    const workspaces = await db.workspaces!.find({ deleted: false });
    const firstWorkspace = workspaces.find(
      ({ name }) => name === "First workspace",
    )!;
    const secondWorkspace = workspaces.find(
      ({ name }) => name === "Second workspace",
    )!;
    const emptyWorkspace = workspaces.find(
      ({ name }) => name === "Empty workspace",
    )!;
    const firstWindow = (await db.windows!.findOne({
      workspace_id: firstWorkspace.id,
    }))!;
    const secondWindow = (await db.windows!.findOne({
      workspace_id: secondWorkspace.id,
    }))!;
    /* Views inserted without filters must receive the database array default. */
    expect(firstWindow.filter).toEqual([]);
    expect(secondWindow.filter).toEqual([]);
    const firstView = page.locator(`[data-box-id="${firstWindow.id}"]`);
    const secondView = page.locator(`[data-box-id="${secondWindow.id}"]`);
    let reloadDelayMs = 0;
    /* Exercise switching while real subscription responses are still in flight. */
    await page.routeWebSocket(
      (url) => url.pathname.startsWith("/ws-api-dbs"),
      (socket) => {
        const server = socket.connectToServer();
        const readyAt = Date.now() + reloadDelayMs;
        server.onMessage((message) => {
          setTimeout(
            () => socket.send(message),
            Math.max(100, readyAt - Date.now()),
          );
        });
      },
    );
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(
      `${deployment.dashboardUrl}?workspaceId=${firstWorkspace.id}`,
    );
    await expect(firstView).toBeVisible();

    /* Fixed tables keep compact search in the header and only filters below. */
    await db.workspaces!.update(
      { id: firstWorkspace.id },
      { layout_mode: "fixed" },
    );
    await db.windows!.update(
      { id: firstWindow.id },
      { options: { ...firstWindow.options, showFilters: false } },
    );
    const tableHeader = firstView.locator(".silver-grid-item-header--icon");
    const filterToggle = tableHeader.getByTestId(
      "dashboard.window.toggleFilterBar",
    );
    await expect(firstView.getByTestId("dashboard.window.menu")).toHaveCount(0);
    await expect(tableHeader.getByTitle("View mode")).toHaveCount(0);
    await expect(tableHeader.getByRole("button").first()).toHaveAttribute(
      "data-command",
      "dashboard.window.toggleFilterBar",
    );
    await expect(tableHeader.locator(".divider")).toHaveCount(0);
    await filterToggle.click();
    const tableSearch = tableHeader.getByTestId("SearchList.Input");
    await expect(tableSearch).toBeVisible();
    await expect(firstView.getByTitle("Edit filters")).toHaveCount(0);
    const searchBounds = (await tableSearch.boundingBox())!;
    const filterToggleBounds = (await filterToggle.boundingBox())!;
    expect(searchBounds.width).toBeLessThanOrEqual(240);
    expect(searchBounds.x + searchBounds.width).toBeLessThanOrEqual(
      filterToggleBounds.x,
    );
    await tableSearch.fill("1");
    await expect(
      tableHeader.getByTestId("SearchList.List").getByRole("option").first(),
    ).toBeVisible();
    await tableSearch.press("Enter");
    await expect(firstView.locator(".SmartFilter")).toBeVisible();
    await expect(firstView.getByTestId("SmartAddFilter")).toHaveCount(0);
    await expect(firstView.locator(".SmartFilterBarRightActions")).toHaveCount(
      0,
    );
    await expect(
      firstView.getByTitle("Edit filters").locator("input"),
    ).toHaveCount(0);
    await filterToggle.click();
    await expect(tableSearch).toHaveCount(0);
    await db.workspaces!.update(
      { id: firstWorkspace.id },
      { layout_mode: "editable" },
    );
    await expect(tableHeader.getByTitle("View mode")).toBeVisible();
    await filterToggle.click();
    await expect(firstView.getByTestId("SmartFilterBar")).toBeVisible();
    await expect(firstView.getByTestId("SmartAddFilter")).toBeVisible();
    await expect(tableSearch).toHaveCount(0);
    await db.windows!.update(
      { id: firstWindow.id },
      { options: firstWindow.options, filter: firstWindow.filter },
    );
    await db.workspaces!.update(
      { id: firstWorkspace.id },
      { layout_mode: firstWorkspace.layout_mode },
    );

    /* Quick search opens while the sidebar is unpinned. */
    const quickSearch = page
      .locator(".TopControls")
      .getByTestId("dashboard.menu.quickSearch");
    await quickSearch.click();
    await expect(page.getByTestId("CommandPalette")).toBeVisible();
    await page.keyboard.press("Escape");

    let dashboard = await page.locator(".Dashboard").elementHandle();
    let topControls = await page.locator(".TopControls").elementHandle();
    const expectDashboardPreserved = async () => {
      expect(await dashboard.evaluate((element) => element.isConnected)).toBe(
        true,
      );
      expect(await topControls.evaluate((element) => element.isConnected)).toBe(
        true,
      );
    };

    /* Switching replaces the views without remounting the dashboard or toolbar. */
    await expect(page.getByTestId("WorkspaceMenu.list")).toHaveCount(0);
    await setOrAddWorkspace(page, "Second workspace");
    await expect(secondView).toBeVisible();
    await expect(firstView).toHaveCount(0);
    await expectDashboardPreserved();

    const dashboardMenu = page.getByTestId("DashboardMenuContent");
    const pinToggle = dashboardMenu
      .locator("footer")
      .getByTestId("DashboardMenu.togglePinned");
    await expect(dashboardMenu).toBeHidden();
    await page.getByTestId("dashboard.menu").click();
    await expect(pinToggle).toHaveAttribute("data-key", "unpinned");
    await pinToggle.click();
    await expect(pinToggle).toHaveAttribute("data-key", "pinned");
    /* Footer controls stay visible and usable when the menu content scrolls. */
    const checkFeedbackFooter = async () => {
      const originalViewport = page.viewportSize()!;
      await page.setViewportSize({
        width: originalViewport.width,
        height: 400,
      });
      const feedback = dashboardMenu.locator("footer").getByTestId("Feedback");
      await expect(feedback).toHaveText("Feedback");
      await expect(feedback.locator("svg")).toHaveCount(0);
      const feedbackBounds = (await feedback.boundingBox())!;
      const footerBounds = (await dashboardMenu
        .locator("footer")
        .boundingBox())!;
      expect(
        footerBounds.x +
          footerBounds.width -
          feedbackBounds.x -
          feedbackBounds.width,
      ).toBeLessThanOrEqual(10);
      const pinBounds = (await pinToggle.boundingBox())!;
      expect(pinBounds.x - footerBounds.x).toBeLessThanOrEqual(10);
      expect(pinBounds.x + pinBounds.width).toBeLessThan(feedbackBounds.x);
      await expect
        .poll(() =>
          dashboardMenu.evaluate((menu) => {
            const content = menu.firstElementChild!;
            const footer = menu.querySelector("footer")!;
            content.scrollTop = content.scrollHeight;
            const footerBounds = footer.getBoundingClientRect();
            return {
              contentOverflows: content.scrollHeight > content.clientHeight,
              footerAtBottom:
                Math.abs(
                  footerBounds.bottom - menu.getBoundingClientRect().bottom,
                ) < 2,
              footerVisible: footerBounds.bottom <= window.innerHeight,
            };
          }),
        )
        .toEqual({
          contentOverflows: true,
          footerAtBottom: true,
          footerVisible: true,
        });
      await feedback.click();
      await expect(page.getByLabel("Details", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.setViewportSize(originalViewport);
    };
    await checkFeedbackFooter();
    /* Pinning preserves quick search and the always-open workspace section. */
    await quickSearch.click();
    await expect(page.getByTestId("CommandPalette")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      dashboardMenu.getByRole("button", { name: "Workspaces", exact: true }),
    ).toHaveCount(0);
    await dashboardMenu.getByText("Workspaces", { exact: true }).click();
    await expect(dashboardMenu.getByTestId("WorkspaceMenu.list")).toBeVisible();
    await expect(dashboardMenu.getByTitle("Search workspaces")).toHaveCount(0);
    await expect(dashboardMenu.getByPlaceholder("Workspaces")).toHaveCount(0);
    await dashboardMenu.getByTitle("Add new workspace").click();
    await expect(page.getByLabel("New workspace name")).toBeVisible();
    await page.keyboard.press("Escape");

    /* Workspace settings open from the header; pinning stays in the footer. */
    const workspaceHeader = dashboardMenu
      .getByText("Workspaces", { exact: true })
      .locator("..");
    await workspaceHeader.getByTestId("dashboard.menu.settingsToggle").click();
    await expect(page.getByTestId("dashboard.menu.settings")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      workspaceHeader.getByTestId("DashboardMenu.togglePinned"),
    ).toHaveCount(0);
    /* The user's unpinned preference survives a reload. */
    await pinToggle.click();
    await expect(dashboardMenu).toBeHidden();
    await expect
      .poll(
        async () =>
          (await db.users!.findOne({ id: firstWorkspace.user_id }))?.options
            ?.pinnedMenu,
      )
      .toBe(false);
    await page.reload();
    await expect(secondView).toBeVisible();
    await expect(dashboardMenu).toBeHidden();
    dashboard = await page.locator(".Dashboard").elementHandle();
    topControls = await page.locator(".TopControls").elementHandle();
    await page.getByTestId("dashboard.menu").click();
    await expect(pinToggle).toHaveAttribute("data-key", "unpinned");
    await checkFeedbackFooter();
    await pinToggle.click();
    await expect(pinToggle).toHaveAttribute("data-key", "pinned");
    await expect
      .poll(
        async () =>
          (await db.users!.findOne({ id: firstWorkspace.user_id }))?.options
            ?.pinnedMenu,
      )
      .toBe(true);
    /* Sidebar width and pinning are saved per user, outside workspace options. */
    const menuBounds = (await dashboardMenu.boundingBox())!;
    await page.mouse.move(
      menuBounds.x + menuBounds.width - 2,
      menuBounds.y + 100,
    );
    await page.mouse.down();
    await page.mouse.move(
      menuBounds.x + menuBounds.width + 38,
      menuBounds.y + 100,
      { steps: 5 },
    );
    await page.mouse.up();
    const resizedMenuWidth = Math.round(
      (await dashboardMenu.boundingBox())!.width,
    );
    expect(resizedMenuWidth).toBeGreaterThan(menuBounds.width);
    await expect
      .poll(
        async () =>
          (await db.users!.findOne({ id: firstWorkspace.user_id }))?.options
            ?.pinnedMenuWidth,
      )
      .toBe(resizedMenuWidth);
    for (const savedWorkspace of await db.workspaces!.find({
      deleted: false,
    })) {
      expect(savedWorkspace.options).not.toHaveProperty("pinnedMenu");
      expect(savedWorkspace.options).not.toHaveProperty("pinnedMenuWidth");
    }

    /* The toolbar layout toggle sits beside the active workspace selector. */
    const layoutToggle = page
      .locator(".TopControls")
      .getByTestId("WorkspaceMenu.toggleWorkspaceLayoutMode");
    await expect(layoutToggle).toHaveCount(1);
    const layoutBounds = (await layoutToggle.boundingBox())!;
    const workspaceBounds = (await page
      .getByTestId("WorkspaceMenuDropDown")
      .boundingBox())!;
    expect(workspaceBounds.x + workspaceBounds.width).toBeLessThanOrEqual(
      layoutBounds.x,
    );
    const wasFixedLayout = secondWorkspace.layout_mode === "fixed";
    await layoutToggle.click();
    await expect(layoutToggle).toHaveAttribute(
      "aria-pressed",
      String(!wasFixedLayout),
    );
    await quickSearch.hover();
    const selectedWorkspaceActions = dashboardMenu
      .getByTestId("WorkspaceMenu.SearchList")
      .locator('[data-key="Second workspace"] .WorkspaceActions');
    await expect(selectedWorkspaceActions).toHaveCSS("opacity", "1");
    await expect(
      selectedWorkspaceActions.getByTitle("Published"),
    ).toBeVisible();
    await expect(
      selectedWorkspaceActions.getByRole("button", {
        name: /^(Edit layout|Lock Layout)$/,
      }),
    ).toBeVisible();
    /* Row layout toggles update active or inactive workspaces without navigation. */
    for (const workspace of [secondWorkspace, firstWorkspace]) {
      const workspaceRow = dashboardMenu
        .getByTestId("WorkspaceMenu.SearchList")
        .locator(`[data-key="${workspace.name}"]`);
      await workspaceRow.hover();
      const workspaceLayoutToggle = workspaceRow
        .locator(".WorkspaceActions")
        .getByRole("button", { name: /^(Edit layout|Lock Layout)$/ });
      await expect(workspaceLayoutToggle).toHaveAttribute(
        "aria-pressed",
        String(
          workspace.id === secondWorkspace.id ?
            !wasFixedLayout
          : workspace.layout_mode === "fixed",
        ),
      );
      await workspaceLayoutToggle.click();
      await expect
        .poll(
          async () =>
            (await db.workspaces!.findOne({ id: workspace.id }))?.layout_mode,
        )
        .toBe(
          workspace.id === secondWorkspace.id ?
            wasFixedLayout ? "fixed"
            : "editable"
          : workspace.layout_mode === "fixed" ? "editable"
          : "fixed",
        );
      await expect(page).toHaveURL(
        new RegExp(`workspaceId=${secondWorkspace.id}$`),
      );
      await expect(layoutToggle).toHaveAttribute(
        "aria-pressed",
        String(wasFixedLayout),
      );
    }

    /* Inactive-workspace actions open without switching the active workspace. */
    const checkWorkspaceActions = async (workspaceList: Locator) => {
      const activeWorkspaceUrl = page.url();
      const inactiveWorkspaceRow = workspaceList.locator(
        '[data-key="First workspace"]',
      );
      await inactiveWorkspaceRow.hover();
      await expect(
        inactiveWorkspaceRow.getByTestId("WorkspaceDeleteBtn"),
      ).toHaveCount(0);
      await expect(
        inactiveWorkspaceRow.getByTestId("WorkspaceMenu.CloneWorkspace"),
      ).toHaveCount(0);
      await expect(
        inactiveWorkspaceRow.getByTitle("Workspace settings"),
      ).toHaveCount(0);
      await inactiveWorkspaceRow.getByTitle("Workspace actions").press("Enter");
      const actionsMenu = page.getByRole("dialog").filter({
        has: page.getByTestId("WorkspaceMenu.CloneWorkspace"),
      });
      await expect(actionsMenu).toBeVisible();
      /* All delete-cancellation paths preserve the underlying menus and URL. */
      for (const closeMethod of ["button", "Escape", "backdrop"]) {
        await actionsMenu.getByTestId("WorkspaceDeleteBtn").click();
        const confirmation = page.getByRole("dialog").filter({
          has: page.getByTestId("WorkspaceDeleteBtn.Confirm"),
        });
        await expect(confirmation).toBeVisible();
        if (closeMethod === "button") {
          await confirmation.getByRole("button", { name: "Cancel" }).click();
        } else if (closeMethod === "Escape") {
          await confirmation
            .getByRole("button", { name: "Cancel" })
            .press("Escape");
        } else {
          await confirmation
            .locator("..")
            .getByTestId("ClickCatchOverlay")
            .click({
              position: { x: 1, y: 1 },
            });
        }
        await expect(confirmation).toBeHidden();
        await expect(actionsMenu).toBeVisible();
        await expect(workspaceList).toBeVisible();
        await expect(page).toHaveURL(activeWorkspaceUrl);
      }
      /* Closing settings returns to the actions menu for the same workspace. */
      await actionsMenu.getByTitle("Workspace settings").click();
      const settings = page
        .getByRole("dialog")
        .and(page.getByTestId("WorkspaceSettings"));
      await expect(settings).toBeVisible();
      await settings.getByTestId("Popup.close").click();
      await expect(settings).toBeHidden();
      await expect(actionsMenu).toBeVisible();
      await expect(page).toHaveURL(activeWorkspaceUrl);
      await actionsMenu
        .locator("..")
        .getByTestId("ClickCatchOverlay")
        .click({
          position: { x: 1, y: 1 },
        });
      await expect(actionsMenu).toBeHidden();
      await expect(workspaceList).toBeVisible();
      await expect(page).toHaveURL(activeWorkspaceUrl);
    };
    await checkWorkspaceActions(
      dashboardMenu.getByTestId("WorkspaceMenu.SearchList"),
    );

    /* Collapsed sections keep their add and schema actions usable. */
    for (const [title, addTitle] of [
      ["Saved queries", "Add SQL query"],
      ["Tables/views", "Create/import table"],
      ["Functions", "Create TS Function"],
      ["Agentic workflows", "Create Agentic Workflow"],
    ]) {
      const sectionToggle = dashboardMenu.getByRole("button", {
        name: title,
        exact: true,
      });
      const section = dashboardMenu.locator(".Section").filter({
        has: page.getByRole("button", { name: title, exact: true }),
      });
      await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");
      await expect(sectionToggle.locator("svg")).toHaveCount(0);
      await sectionToggle.click();
      await expect(sectionToggle).toHaveAttribute("aria-expanded", "false");
      await expect(section.locator(":scope > div")).toHaveCount(1);
      if (title === "Tables/views") {
        await section
          .getByRole("button", { name: "Show schema diagram" })
          .click();
        const schemaDiagram = page.getByTestId("SchemaGraph");
        await expect(schemaDiagram).toBeVisible();
        await schemaDiagram.getByTestId("Popup.close").click();
        await expect(sectionToggle).toHaveAttribute("aria-expanded", "false");
      }
      const addButton = section.getByRole("button", {
        name: addTitle,
        exact: true,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();
      await expect(sectionToggle).toHaveAttribute("aria-expanded", "false");
      if (title === "Saved queries") {
        await expect(page.locator('[data-view-type="sql"]')).toHaveCount(1);
      } else if (title === "Tables/views") {
        await expect(
          page.getByText("Create table", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText("Import file", { exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
      } else if (title === "Functions") {
        await expect(
          page.getByText("Add function", { exact: true }).first(),
        ).toBeVisible();
        await page.getByTestId("Popup.close").click();
      } else {
        await expect(
          page.getByText("Agentic workflows are created through the", {
            exact: false,
          }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
      }
      await sectionToggle.click();
      await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");
    }
    await expect(
      dashboardMenu.getByTestId("dashboard.menu.savedQueriesList"),
    ).toBeVisible();

    /* Browser history preserves the dashboard, toolbar and sidebar preferences. */
    await page.goBack();
    await expect(firstView).toBeVisible();
    await expectDashboardPreserved();
    await expect(pinToggle).toHaveAttribute("data-key", "pinned");
    await expect(dashboardMenu).toHaveCSS("width", `${resizedMenuWidth}px`);
    await page.goForward();
    await expect(secondView).toBeVisible();
    await expectDashboardPreserved();
    await expect(pinToggle).toHaveAttribute("data-key", "pinned");
    await expect(dashboardMenu).toHaveCSS("width", `${resizedMenuWidth}px`);

    /* An empty workspace clears the views without remounting the dashboard. */
    await setOrAddWorkspace(page, "Empty workspace");
    await expect(page.locator("[data-view-type]")).toHaveCount(0);
    await expectDashboardPreserved();

    /* The narrow-screen dropdown supports actions and closes after selection. */
    await page.setViewportSize({ width: 650, height: 900 });
    await page.reload();
    const workspaceSelector = page
      .locator(".TopControls")
      .getByTestId("WorkspaceMenuDropDown");
    const workspaceList = page.getByTestId("WorkspaceMenu.SearchList");
    const selectWorkspace = async (workspaceName: string) => {
      await workspaceSelector.click();
      await workspaceList.getByText(workspaceName, { exact: true }).click();
    };
    await expect(workspaceSelector).toHaveText("Empty workspace");
    await workspaceSelector.click();
    await checkWorkspaceActions(workspaceList);
    await page.keyboard.press("Escape");
    await expect(workspaceList).toBeHidden();
    dashboard = await page.locator(".Dashboard").elementHandle();
    topControls = await page.locator(".TopControls").elementHandle();
    await selectWorkspace("First workspace");
    await expect(workspaceSelector).toHaveText("First workspace");
    await expect(workspaceList).toBeHidden();
    await expect(firstView).toBeVisible();
    await expectDashboardPreserved();

    /* Start the next navigation before the previous workspace finishes loading. */
    await selectWorkspace("Second workspace");
    await expect(firstView).toBeVisible();
    await expectDashboardPreserved();
    await selectWorkspace("Empty workspace");
    await expect(workspaceSelector).toHaveText("Empty workspace");
    await expect(page.locator("[data-view-type]")).toHaveCount(0);
    await expectDashboardPreserved();

    /* Returning to the visible workspace must cancel a pending switch too. */
    await selectWorkspace("First workspace");
    await selectWorkspace("Empty workspace");
    await expect(page).toHaveURL(
      new RegExp(`workspaceId=${emptyWorkspace.id}$`),
    );
    await expect(workspaceSelector).toHaveText("Empty workspace");

    /* Live renames update inactive rows without changing the active workspace. */
    await db.workspaces!.update(
      { id: firstWorkspace.id },
      { name: "Inactive workspace" },
    );
    await workspaceSelector.click();
    await expect(
      workspaceList.getByText("Inactive workspace", { exact: true }),
    ).toBeVisible();
    await expect(workspaceSelector).toHaveText("Empty workspace");
    await page.keyboard.press("Escape");
    await expectDashboardPreserved();

    /* Enter and Create select a new empty workspace at both viewport widths. */
    for (const width of [1080, 650]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload();
      await setOrAddWorkspace(page, "Second workspace");
      await expect(secondView).toBeVisible();
      for (const submitMethod of ["Enter", "Create"]) {
        const workspaceName = `Created with ${submitMethod} at ${width}px`;
        if (submitMethod === "Enter") {
          await getDashboardUtils(page).openMenuIfClosed();
        } else {
          await workspaceSelector.click();
        }
        const workspaceMenu = await openWorkspaceMenu(page);
        await workspaceMenu
          .getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn")
          .click();
        const workspaceNameInput = page.getByLabel("New workspace name");
        await workspaceNameInput.fill(workspaceName);
        if (submitMethod === "Enter") {
          await workspaceNameInput.press("Enter");
        } else {
          await page.getByTestId("WorkspaceAddBtn.Create").click();
        }
        await expect(workspaceNameInput).toHaveCount(0);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        const createdWorkspace = (await db.workspaces!.findOne({
          name: workspaceName,
        }))!;
        await expect(page).toHaveURL(new RegExp(createdWorkspace.id));
        await expect(page.locator("[data-view-type]")).toHaveCount(0);
        await setOrAddWorkspace(page, workspaceName);
        expect(await db.workspaces!.count({ name: workspaceName })).toBe(1);
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      if (width === 1080) {
        /* Closing workspace search clears its filter and restores all rows. */
        const searchToggle = dashboardMenu.getByTitle("Search workspaces");
        const searchInput = dashboardMenu.getByPlaceholder("Workspaces");
        const workspaceRows = dashboardMenu
          .getByTestId("WorkspaceMenu.SearchList")
          .getByRole("option");
        await expect(searchToggle).toHaveAttribute("aria-expanded", "false");
        await expect(searchInput).toHaveCount(0);
        await searchToggle.click();
        await expect(searchInput).toBeFocused();
        await searchInput.fill("Second workspace");
        await expect(workspaceRows).toHaveCount(1);
        await expect(workspaceRows).toHaveText("Second workspace");
        await searchToggle.click();
        await expect(searchInput).toHaveCount(0);
        await expect(workspaceRows).toHaveCount(5);
        await searchToggle.click();
        await expect(searchInput).toHaveValue("");
        await searchToggle.click();
      }
    }
    /* Cloning selects the copy and closes the dropdown and actions menu. */
    await workspaceSelector.click();
    const workspaceToClone = workspaceList.locator(
      '[data-key="Second workspace"]',
    );
    await workspaceToClone.hover();
    await workspaceToClone.getByTitle("Workspace actions").click();
    await page.getByTestId("WorkspaceMenu.CloneWorkspace").click();
    await expect(workspaceSelector).toHaveText("Second workspace (Copy)");
    await expect(workspaceList).toBeHidden();
    await expect(page.getByTestId("WorkspaceMenu.CloneWorkspace")).toHaveCount(
      0,
    );
    const clonedWorkspace = (await db.workspaces!.findOne({
      name: "Second workspace (Copy)",
    }))!;
    await expect(page).toHaveURL(new RegExp(clonedWorkspace.id));

    /* Screenshot reloads must allow the dashboard to finish subscribing. */
    await page.setViewportSize({ width: 900, height: 900 });
    reloadDelayMs = 6_000;
    await toggleFixedLayout(page, true);
    reloadDelayMs = 0;
    await page.locator(".TopHeader").evaluate((header) => {
      (header as HTMLElement).style.display = "none";
    });
    await toggleFixedLayout(page, false);
    await toggleFixedLayout(page, false);

    /* A filtered sidebar and an open dropdown must not hide existing workspaces. */
    await page.setViewportSize({ width: 1080, height: 900 });
    await page.reload();
    const additionalWorkspaces = await Promise.all(
      Array.from({ length: 35 }, (_, index) =>
        db.workspaces!.insert(
          {
            name: `Additional workspace ${index}`,
            connection_id: firstWorkspace.connection_id,
            user_id: firstWorkspace.user_id,
          },
          { returning: "*" },
        ),
      ),
    );
    await setOrAddWorkspace(page, "default");
    const defaultWorkspace = (await db.workspaces!.findOne({
      name: "default",
      deleted: false,
    }))!;
    await dashboardMenu.getByTitle("Search workspaces").click();
    await dashboardMenu.getByPlaceholder("Workspaces").fill("Second");
    await setOrAddWorkspace(page, "default");
    expect(await db.workspaces!.count({ name: "default" })).toBe(1);
    const workspaceCount = await db.workspaces!.count({ deleted: false });
    await expect(
      dashboardMenu.getByTestId("WorkspaceMenu.SearchList").getByRole("option"),
    ).toHaveCount(workspaceCount);
    await workspaceSelector.click();
    const dropdown = page.getByRole("dialog").filter({
      has: page.getByTestId("WorkspaceMenu.SearchList"),
    });
    await expect(dropdown.getByRole("option")).toHaveCount(workspaceCount);
    await dropdown.getByPlaceholder("Workspaces").fill("missing workspace");
    await setOrAddWorkspace(page, "Second workspace");
    await expect(dropdown).toBeHidden();
    await db.workspaces!.delete({
      id: { $in: additionalWorkspaces.map(({ id }) => id) },
    });
    await page.reload();
    await expect(
      dashboardMenu.getByTestId("WorkspaceMenu.SearchList").getByRole("option"),
    ).toHaveCount(workspaceCount - additionalWorkspaces.length);

    /* Preserve default even when it is last; delete both active and inactive rows. */
    await workspaceSelector.click();
    await dropdown.getByPlaceholder("Workspaces").fill("Second");
    await deleteAllWorkspaces(page);
    expect(await db.workspaces!.find({ deleted: false })).toMatchObject([
      { id: defaultWorkspace.id, name: "default" },
    ]);
    await expect(workspaceSelector).toHaveText("default");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await deleteAllWorkspaces(page);

    /* With the sidebar closed, cleanup must open the menu and stop at a replacement. */
    await page.setViewportSize({ width: 650, height: 900 });
    await page.reload();
    await deleteAllWorkspaces(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await db.workspaces!.update(
      { id: defaultWorkspace.id },
      { name: "Renamed workspace" },
    );
    await page.reload();
    await expect(workspaceSelector).toHaveText("Renamed workspace");
    await deleteAllWorkspaces(page);
    await expect(workspaceSelector).toHaveText("default");
    await expect(workspaceSelector).not.toHaveAttribute(
      "data-workspace-id",
      defaultWorkspace.id,
    );
    expect(await db.workspaces!.count({ deleted: false })).toBe(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await deployment.dispose();
  }
};

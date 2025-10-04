import { localSettings } from "../../dashboard/localSettings";
import { tout } from "../../utils";

export const setThemeForSVGScreenshot = async (theme: undefined | "dark") => {
  const resetUICallbacks: (() => void)[] = [];

  /** Ensure that any sql suggestion popups are opened back */
  const sqlEditor = document.querySelector<HTMLDivElement>(`div.ProstglesSQL`);
  if (sqlEditor?.sqlRef?.editor) {
    const suggestionsAreShown = //@ts-ignore
      sqlEditor.sqlRef.editor._contextKeyService?.getContextKeyValue(
        "suggestWidgetVisible",
      );
    const position = sqlEditor.sqlRef.editor.getPosition();
    if (suggestionsAreShown && position) {
      resetUICallbacks.push(async () => {
        await tout(1000);
        const editor =
          document.querySelector<HTMLDivElement>(`div.ProstglesSQL`);
        editor?.sqlRef?.editor.setPosition(position);
        await tout(100);
        editor?.sqlRef?.editor.trigger(
          "demo",
          "editor.action.triggerSuggest",
          {},
        );
      });
    }
  }
  localSettings.get().$set({ themeOverride: theme });
  await tout(1000);
  for (const cb of resetUICallbacks) {
    await cb();
  }
  await tout(1000);
};

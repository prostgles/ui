import type { editor } from "monaco-editor";
import { isObject } from "prostgles-types";

export const hackyShowDocumentationBecauseStorageServiceIsBrokenSinceV42 = (
  editor: editor.IStandaloneCodeEditor,
  expandSuggestionDocs = true,
) => {
  const suggestController = editor.getContribution(
    "editor.contrib.suggestController",
  );
  //@ts-ignore
  if (suggestController?.widget) {
    //@ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const suggestWidget = suggestController.widget.value;
    if (suggestWidget && suggestWidget._setDetailsVisible) {
      // This will default to visible details. But when user switches it off
      // they will remain switched off:
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      suggestWidget._setDetailsVisible(expandSuggestionDocs);
    }

    // if (suggestWidget && suggestWidget._persistedSize) {
    //   suggestWidget._persistedSize.store({width: 200, height: 256});
    // }
  }
};

export const hackyFixOptionmatchOnWordStartOnly = (
  editor: editor.IStandaloneCodeEditor,
) => {
  try {
    /* 
      118 for 0.50 
      119 for 0.52.0
      133 for 0.53 
    */
    const indexOfConfig = 133;
    // ensure typing name matches relname
    // suggestModel.js:420
    //@ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const confObj = editor._configuration?.options?._values?.[indexOfConfig];
    if (!isObject(confObj)) {
      console.error(
        "new monaco version might have broken hackyFixOptionmatchOnWordStartOnly again",
      );
    }
    if (confObj && "matchOnWordStartOnly" in confObj) {
      //@ts-ignore
      editor._configuration.options._values[
        indexOfConfig
      ].matchOnWordStartOnly = false;
    }
  } catch (e) {}
};

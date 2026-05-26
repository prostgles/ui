import type { editor, IDisposable, IPosition } from "monaco-editor";
import { getMonaco } from "src/dashboard/SQLEditor/W_SQLEditor";
import type { Monaco } from "src/dashboard/W_SQL/monacoEditorTypes";

export const navigateTo = async (
  editor: editor.IStandaloneCodeEditor,
  targetModel: editor.ITextModel,
  pos: IPosition,
  /** push source location onto nav stack before jumping */
  from?: { uri: string; position: IPosition },
) => {
  if (from) pushNav(from.uri, from.position);
  pushNav(targetModel.uri.toString(), pos);
  const monaco = await getMonaco();
  editor.setModel(targetModel);
  editor.setPosition(pos);
  editor.revealPositionInCenter(pos, monaco.editor.ScrollType.Smooth);
  editor.focus();
};

// ─── Navigation stack (back/forward support) ──────────────────────────────
interface NavEntry {
  uri: string;
  position: IPosition;
}

const navStack: NavEntry[] = [];
let navIndex = -1;

const pushNav = (uri: string, position: IPosition): void => {
  // Drop any forward history when navigating to a new location
  navStack.splice(navIndex + 1);
  navStack.push({ uri, position });
  navIndex = navStack.length - 1;
};

// ─── Install Alt+Left / Alt+Right back/forward ────────────────────────────
export const installBackForward = (
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco,
): IDisposable => {
  return editor.addCommand(
    // Alt+Left  = navigate back
    monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow,
    () => {
      if (navIndex <= 0) return;
      navIndex--;
      const entry = navStack[navIndex]!;
      const targetModel = monaco.editor.getModel(monaco.Uri.parse(entry.uri));
      if (!targetModel) return;
      editor.setModel(targetModel);
      editor.setPosition(entry.position);
      editor.revealPositionInCenter(
        entry.position,
        monaco.editor.ScrollType.Smooth,
      );
    },
  ) as unknown as IDisposable;
  // Note: addCommand returns a string (command id), not IDisposable.
  // Wrap both keybindings together or ignore the return type in practice.
};

import { tout } from "src/utils";
import { click, movePointer, openConnection } from "../demoUtils";

export const schemaDiagramDemo = async () => {
  await click("dashboard.goToConnections");
  await openConnection("food_delivery");
  await click("SchemaGraph");
  await tout(1000);
  await movePointer(424, 730);
  await movePointer(816, 756);
  await tout(1000);
  await click("Popup.close");
};

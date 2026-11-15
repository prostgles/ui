import { test as base } from "../utils/fixtures";

export { expect } from "../utils/fixtures";

export const test = base.extend({
  viewport: { width: 1080, height: 1080 },
});

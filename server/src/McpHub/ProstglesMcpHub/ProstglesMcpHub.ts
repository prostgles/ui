import type { DBS } from "@src/index";

class ProstglesMcpHub {
  constructor(private dbs: DBS) {}

  servers: Map<string, any> = new Map();
}

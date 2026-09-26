type BBox = { l: number; t: number; r: number; b: number; coord_origin: string };
type Provenance = { page_no: number; bbox: BBox; charspan?: [number, number] };
type Item = {
  self_ref?: string;
  text?: string;
  prov?: Provenance[];
  children?: { $ref: string }[];
  data?: { table_cells: { text: string; bbox?: BBox }[] };
};
export type AnnotationDocument = {
  pages: Record<string, { size: { width: number; height: number } }>;
  texts?: Item[];
  tables?: Item[];
  groups?: Item[];
  pictures?: Item[];
  body?: Item;
  furniture?: Item;
};

export const getAnnotationPageText = (document: AnnotationDocument, page: number) => {
  const size = document.pages[page]?.size;
  if (!size) throw new Error(`Page ${page} is missing from Docling`);
  const items = [
    ...(document.texts ?? []), ...(document.tables ?? []),
    ...(document.groups ?? []), ...(document.pictures ?? []),
  ];
  const byRef = new Map(items.map((item) => [item.self_ref, item]));
  const visited = new Set<Item>();
  const segments: { start: number; end: number; bbox: BBox }[] = [];
  let text = "";
  const append = (value: string, bbox: BBox) => {
    if (!value.trim()) return;
    if (text) text += "\n";
    segments.push({ start: text.length, end: text.length + value.length, bbox });
    text += value;
  };
  const visit = (item: Item) => {
    if (visited.has(item)) return;
    visited.add(item);
    for (const prov of item.prov ?? []) {
      if (prov.page_no !== page) continue;
      if (item.text !== undefined) {
        const value = prov.charspan ? item.text.slice(...prov.charspan) : item.text;
        append(value, prov.bbox);
      } else if (item.data) {
        for (const cell of item.data.table_cells) append(cell.text, cell.bbox ?? prov.bbox);
      }
    }
    for (const child of item.children ?? []) {
      const childItem = byRef.get(child.$ref);
      if (childItem) visit(childItem);
    }
  };
  if (document.body) visit(document.body);
  if (document.furniture) visit(document.furniture);
  items.forEach(visit);
  return {
    text,
    getBBox: (range: { start: number; end: number }) => {
      const boxes = segments.filter((s) => s.start < range.end && s.end > range.start)
        .map(({ bbox }) => ({
          x: bbox.l,
          y: bbox.coord_origin === "BOTTOMLEFT" ? size.height - bbox.t : bbox.t,
          width: bbox.r - bbox.l,
          height: Math.abs(bbox.b - bbox.t),
        }));
      if (!boxes.length) return undefined;
      const x = Math.min(...boxes.map((box) => box.x));
      const y = Math.min(...boxes.map((box) => box.y));
      return {
        x, y,
        width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
        height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
      };
    },
  };
};

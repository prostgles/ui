type DoclingBBox = {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: "BOTTOMLEFT" | "TOPLEFT";
};

export type DoclingDocument = {
  schema_name: "DoclingDocument";
  version: "1.9.0";
  name: "blob";
  origin: {
    mimetype: "application/pdf";
    binary_hash: number;
    filename: "blob";
    uri: null;
  };
  furniture: {
    self_ref: "#/furniture";
    parent: null;
    children: [];
    content_layer: "furniture";
    meta: null;
    name: "_root_";
    label: "unspecified";
  };
  body: {
    self_ref: "#/body";
    parent: null;
    children: {
      $ref: string;
    }[];
    content_layer: "body";
    meta: null;
    name: "_root_";
    label: "unspecified";
  };
  groups: [];
  texts: {
    self_ref: string;
    parent: {
      $ref: string;
    };
    children: [];
    content_layer: "body";
    meta: null;
    label:
      | "section_header"
      | "list_item"
      | "paragraph"
      | "footnote"
      | "caption"
      | "table_cell";
    prov: [
      {
        page_no: number;
        bbox: DoclingBBox;
        charspan: [number, number];
      },
    ];
    /**
     * original text extracted from the source document,
     * preserving its source form as closely as Docling retained it.
     */
    orig: string;
    /**
     * Docling’s processed or normalized text, intended for structured export and downstream use.
     * It may have cleanup or normalization applied, such as whitespace or character handling.
     */
    text: string;
    formatting: null;
    hyperlink: null;
    level?: number;
  }[];
  pictures: [];
  tables: {
    self_ref: string;
    parent: {
      $ref: string;
    };
    children: [];
    content_layer: "body";
    meta: null;
    label: "table";
    prov: [
      {
        page_no: number;
        bbox: DoclingBBox;
        charspan: [number, number];
      },
    ];
    captions: [];
    references: [];
    footnotes: [];
    image: null | DoclingImage;
    data: {
      table_cells: {
        bbox: DoclingBBox;
        row_span: 1;
        col_span: 1;
        start_row_offset_idx: 0;
        end_row_offset_idx: 1;
        start_col_offset_idx: 0;
        end_col_offset_idx: 1;
        text: string;
        column_header: false;
        row_header: false;
        row_section: false;
        fillable: false;
      }[];
      num_rows: number;
      num_cols: number;
      grid: {
        bbox: DoclingBBox;
        row_span: number;
        col_span: number;
        start_row_offset_idx: 0;
        end_row_offset_idx: 1;
        start_col_offset_idx: 0;
        end_col_offset_idx: 1;
        text: string;
        column_header: false;
        row_header: false;
        row_section: false;
        fillable: false;
      }[][];
    };
    annotations: [];
  }[];
  key_value_items: [];
  form_items: [];
  pages: Record<
    string,
    {
      size: {
        width: 375.1199951171875;
        height: 450;
      };
      image: null | DoclingImage;
      page_no: 1;
    }
  >;
};

type DoclingImage = {
  mimetype: "image/png";
  dpi: 144;
  size: {
    width: 750;
    height: 900;
  };
  uri: string;
};

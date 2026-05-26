/**
 * Represents a rendered cell in a card layout
 */
type CardLayoutRowColumnValue = {
  type: "node";
  columnName: string;
  /**
   * React.CSSProperties;
   */
  style?: Record<string, string | number>;
  /**
   * If true, label will be hidden and only value will be shown
   */
  hideLabel?: boolean;
};

/**
 * Renders a div element with specified style and contents.
 * Used to arrange children in flex row/column/row-wrapped layouts for efficient content density.
 */
export type CardLayout = {
  type?: "container";
  /**
   * React.CSSProperties;
   */
  style?: Record<string, string | number>;
  children: (CardLayout | CardLayoutRowColumnValue)[];
};

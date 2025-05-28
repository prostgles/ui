import type { UIDocElement } from "../../../../UIDocs";

export const paginationUIDoc: UIDocElement = {
  selectorCommand: "Pagination",
  type: "section",
  title: "Pagination Controls",
  description: "Navigation controls for paginated data.",
  children: [
    {
      selectorCommand: "Pagination.firstPage",
      type: "button",
      title: "First Page",
      description: "Navigate to the first page of results.",
    },
    {
      selectorCommand: "Pagination.prevPage",
      type: "button",
      title: "Previous Page",
      description: "Navigate to the previous page of results.",
    },
    {
      selectorCommand: "Pagination.page",
      type: "input",
      inputType: "number",
      title: "Page Number",
      description:
        "Current page number. You can type a specific page number to jump directly to that page.",
    },
    {
      selectorCommand: "Pagination.nextPage",
      type: "button",
      title: "Next Page",
      description: "Navigate to the next page of results.",
    },
    {
      selectorCommand: "Pagination.lastPage",
      type: "button",
      title: "Last Page",
      description: "Navigate to the last page of results.",
    },
    {
      selectorCommand: "Pagination.pageSize",
      type: "select",
      title: "Page Size",
      description:
        "Select how many rows to display per page. Changing this may adjust the current page if it would exceed the total number of pages.",
    },
    {
      selectorCommand: "Pagination.pageCountInfo",
      type: "text",
      title: "Page Count Information",
      description:
        "Displays the total number of pages and rows in the current dataset.",
    },
  ],
};

import { CONTENT_TYPE_TO_EXT, getKeys } from "prostgles-types";
import type { NewRowDataHandler } from "../../SmartFormNewRowDataHandler";
import type { SmartFormFieldLinkedDataProps } from "../SmartFormFieldLinkedData";
import { act, useMemo } from "react";

type P = Pick<SmartFormFieldLinkedDataProps, "column" | "action"> & {
  newRowDataHandler: NewRowDataHandler;
};

export const useSmartFormFieldLinkedDataInsert = ({
  column,
  action,
  newRowDataHandler,
}: P) => {
  const columnFile = column.file;
  const fileUpsertInsert = useMemo(() => {
    if (!(columnFile && ["insert", "update"].includes(action))) {
      return;
    }

    let inputAccept: string | undefined;
    if (
      "acceptedContent" in columnFile &&
      Array.isArray(columnFile.acceptedContent) &&
      columnFile.acceptedContent.length
    ) {
      inputAccept =
        columnFile.acceptedContent.map((c) => `${c}/*`).join() +
        "," +
        columnFile.acceptedContent
          .flatMap((type) =>
            getKeys(CONTENT_TYPE_TO_EXT)
              .filter((k) => k.startsWith(type))
              .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
              .flat(),
          )
          .map((type) => `.${type}`)
          .join(",");
    } else if (
      "acceptedContentType" in columnFile &&
      Array.isArray(columnFile.acceptedContentType) &&
      columnFile.acceptedContentType.length
    ) {
      inputAccept = columnFile.acceptedContentType
        .flatMap((type) =>
          getKeys(CONTENT_TYPE_TO_EXT)
            .filter((k) => k === type)
            .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
            .flat(),
        )
        .map((type) => `.${type}`)
        .join(",");
    } else if (
      "acceptedFileTypes" in columnFile &&
      Array.isArray(columnFile.acceptedFileTypes) &&
      columnFile.acceptedFileTypes.length
    ) {
      inputAccept = `${columnFile.acceptedFileTypes.map((type) => `.${type}`).join(",")}`;
    }

    const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const file = e.currentTarget.files?.[0];
      newRowDataHandler.setNestedFileColumn(
        column.name,
        file && {
          name: file.name,
          data: file,
        },
      );
    };

    return { inputAccept, onInputChange };
  }, [action, columnFile, newRowDataHandler, column.name]);

  return { fileUpsertInsert };
};

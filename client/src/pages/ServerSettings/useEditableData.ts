import { isEqual } from "prostgles-types";
import { useCallback, useMemo, useState } from "react";

export const useEditableData = <T extends Record<string, any> | undefined>(
  initialData: T,
) => {
  const [error, setError] = useState<any>();
  const [editedData, setEditedData] = useState<T | undefined>(initialData);
  const value = editedData ?? initialData;

  const didChange = useMemo(() => {
    return editedData && !isEqual(editedData, initialData);
  }, [editedData, initialData]);

  const onSave = useCallback(
    (onSavePromise: () => Promise<void>) => {
      return onSavePromise()
        .then(() => {
          setEditedData(undefined);
          setError(undefined);
        })
        .catch((err) => {
          setError(err);
          throw err;
        });
    },
    [setError, setEditedData],
  );

  const setValue = useCallback(
    <K extends keyof NonNullable<T> & string>(
      newData: Pick<NonNullable<T>, K> | undefined,
    ) => {
      if (!value) return setError("Value is undefined. Must pass full data");

      if (newData === undefined) {
        setEditedData(undefined);
      } else {
        setEditedData({ ...value, ...newData });
      }
      setError(undefined);
    },
    [value],
  );

  return {
    value,
    originalValue: initialData,
    didChange,
    onSave: didChange ? onSave : undefined,
    setValue,
    error,
    setError,
  };
};

import type { JoinedRecords, JoinedRecordsState } from "./JoinedRecords";

export const prepareJoinedRecordsSections = async function (
  this: JoinedRecords,
) {
  const dataSignature = this.getDataSignature();
  if (dataSignature === this.dataSignature) return;

  const {
    tables,
    db,
    tableName,
    showLookupTables = true,
    showOnlyFKeyTables,
  } = this.props;
  const tableJoins = tables
    .find((t) => t.name === tableName)
    ?.joins.filter((j) => j.hasFkeys || !showOnlyFKeyTables);
  if (!tableJoins) return;
  this.setState({ isLoadingSections: true });
  this.dataSignature = dataSignature;
  const diplayedTables = tableJoins.slice(0, 0).map((d) => ({
    ...d,
    path: undefined as string[] | undefined,
  }));

  // TODO allow customising Related data section
  // diplayedTables = [
  //   ...diplayedTables,
  //   ...extraSectionPaths.map(({ path, table }) => ({
  //     tableName: table.name,
  //     path: path.map(p => p.table),
  //     // on: [] as [string, string][][],
  //     on: [],
  //     hasFkeys: true,
  //   } satisfies typeof diplayedTables[number]))
  // ]

  tableJoins.forEach((j) => {
    const jtable = tables.find((t) => t.name === j.tableName);
    if (!jtable) return;

    const joinCols = j.on.flatMap((j) => j[1]);

    /** Is only used for joining and has no other data */
    const nextJoiningTables = jtable.joins.filter((nextJoin) => {
      const nextJoinCols = nextJoin.on.flatMap((j) => j[0]);
      const isNotAlreadyAjoinOrThisTable = !(nextJoin.tableName === tableName); // ![table.name, ...table.joins.map(tj => tj.tableName)].includes(j.tableName);
      const allColumnsAreJoinColumns =
        Array.from(new Set([...nextJoinCols, ...joinCols])).length ===
        jtable.columns.length;
      return isNotAlreadyAjoinOrThisTable && allColumnsAreJoinColumns;
    });

    nextJoiningTables.forEach((nextTable) => {
      diplayedTables.unshift({
        ...j,
        tableName: nextTable.tableName,
        path: [j.tableName, nextTable.tableName],
      });
    });

    /** Only joins to this table */
    const isLookupTable =
      !nextJoiningTables.length &&
      jtable.columns.every((c) => j.on.some((o) => o[1] === c.name));
    if (isLookupTable) {
      if (showLookupTables) diplayedTables.push({ ...j, path: undefined });
    } else {
      diplayedTables.unshift({ ...j, path: undefined });
    }
  });

  const sections = await Promise.all(
    diplayedTables.map(async (j) => {
      const joinFilter = this.getJoinFilter(j.path ?? [j.tableName]);
      let countStr = "0";
      let error: string | undefined;
      try {
        if (!this.isInsert) {
          countStr =
            (await db[j.tableName]?.count?.(joinFilter))?.toString() ?? "0";
        }
      } catch (err) {
        error = `Failed to db.${j.tableName}.count(${JSON.stringify(joinFilter)})`;
        console.error(error);
      }
      const existingDataCount = this.isInsert ? 0 : parseInt(countStr);
      const canInsert = db[j.tableName]?.insert && j.hasFkeys; // || !existingDataCount;

      const res: JoinedRecordsState["sections"][number] = {
        label: j.tableName,
        tableName: j.tableName,
        existingDataCount,
        canInsert,
        path: j.path ?? [j.tableName],
        error,
        expanded: this.state.sections.find((s) => s.tableName === j.tableName)
          ?.expanded,
      };

      return res;
    }),
  );
  this.setState({ sections, isLoadingSections: false });
};

type Shape =
  | {
      type: "linkline";
      id: string; // Link's own ID, not used in logic but part of type
      sourceId: string; // Table WITH the foreign key
      targetId: string; // Table BEING REFERENCED by the foreign key
    }
  | {
      type: "rectangle";
      id: string; // Table's ID
    };

export function replayTableRelationships(shapes: Shape[]): string[][] {
  const tables: { type: "rectangle"; id: string }[] = [];
  const links: {
    type: "linkline";
    id: string;
    sourceId: string;
    targetId: string;
  }[] = [];

  for (const shape of shapes) {
    if (shape.type === "rectangle") {
      tables.push(shape);
    } else {
      links.push(shape);
    }
  }

  const allTableIds = new Set<string>(tables.map((t) => t.id));

  // Filter links to ensure they connect actual tables
  const validLinks = links.filter(
    (link) => allTableIds.has(link.sourceId) && allTableIds.has(link.targetId),
  );

  const tablesWithOutgoingFKs = new Set<string>();
  const linksByTarget = new Map<string, string[]>(); // targetId -> [sourceId1, sourceId2, ...]

  for (const link of validLinks) {
    tablesWithOutgoingFKs.add(link.sourceId);

    if (!linksByTarget.has(link.targetId)) {
      linksByTarget.set(link.targetId, []);
    }
    linksByTarget.get(link.targetId)!.push(link.sourceId);
  }

  // 1. Start with root tables (tables that do not have any outgoing foreign keys)
  let currentLayerIds: string[] = [];
  for (const tableId of allTableIds) {
    if (!tablesWithOutgoingFKs.has(tableId)) {
      currentLayerIds.push(tableId);
    }
  }

  // Sort for consistent output, though not strictly required by prompt
  currentLayerIds.sort();

  const resultLayers: string[][] = [];
  const processedTableIds = new Set<string>();

  if (currentLayerIds.length === 0 && allTableIds.size > 0) {
    // This could happen if all tables are part of a cycle or there are no tables without FKs.
    // If there are tables, but no clear roots as defined, it might indicate a cyclic dependency
    // starting point, or simply no tables qualify.
    // Depending on desired behavior for pure cycles, we might return all tables or an error.
    // For now, if no roots are found, and there are tables, we stop.
    // If the goal is to include all tables even in cycles, a different approach might be needed for initial seeding.
    // However, the prompt's steps imply starting from non-dependent tables.
    return [];
  }

  if (currentLayerIds.length > 0) {
    resultLayers.push([...currentLayerIds]); // Add a copy
    currentLayerIds.forEach((id) => processedTableIds.add(id));
  }

  // 2. Add to the previous list of tables the tables that directly reference them
  // 3. Continue this until reaching the end
  while (currentLayerIds.length > 0) {
    const nextLayerCandidates = new Set<string>();

    for (const targetTableId of currentLayerIds) {
      const referencingSourceIds = linksByTarget.get(targetTableId) || [];
      for (const sourceTableId of referencingSourceIds) {
        if (!processedTableIds.has(sourceTableId)) {
          nextLayerCandidates.add(sourceTableId);
        }
      }
    }

    if (nextLayerCandidates.size === 0) {
      break; // No new tables found, end of the replay
    }

    const nextLayerIdsArray = Array.from(nextLayerCandidates).sort(); // Sort for consistency
    resultLayers.push(nextLayerIdsArray);
    nextLayerIdsArray.forEach((id) => processedTableIds.add(id));
    currentLayerIds = nextLayerIdsArray;
  }

  // It's possible some tables are part of cycles not reachable from roots,
  // or are isolated components that were not roots (e.g. a table with an FK to itself only).
  // The current logic only includes tables reachable from the initial root set.
  // If all tables must be included, even unreachables/cycles not connected to roots,
  // additional logic would be needed to find and process remaining unprocessedTableIds.
  // However, following the prompt's steps, this should be the correct output.

  return resultLayers;
}

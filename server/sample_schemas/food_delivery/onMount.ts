export const onMount: ProstglesOnMount = async ({ dbo }) => {
  const roadTableHandler = dbo['"roads.geojson"'];
  if (!roadTableHandler) return;

  const count = await roadTableHandler.count();
  if (count) {
    await dbo.sql(`
      VACUUM;
    `);

    const mockLocations = async () => {
      try {
        await dbo.sql(`CALL mock_locations(); /* from fork */`);
      } catch (error) {
        console.error("Error calling mock_locations", error);
        const funcs = await dbo.sql(
          `
          SELECT proname, probin, pg_get_function_arguments(oid), current_database(), (SELECT string_agg(extname, '; ') FROM pg_catalog.pg_extension) as extensions
          FROM pg_catalog.pg_proc
          WHERE proname = 'st_lineinterpolatepoint'
        `,
          {},
          { returnType: "rows" },
        );
        console.error(funcs);
        throw error;
      }
      mockLocations();
    };
    mockLocations();

    setInterval(async () => {
      const hourOfDayAverageOrders = {
        0: 2,
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 2,
        7: 3,
        8: 5,
        9: 8,
        10: 10,
        11: 12,
        12: 12,
        13: 12,
        14: 10,
        15: 10,
        16: 10,
        17: 12,
        18: 15,
        19: 15,
        20: 12,
        21: 8,
        22: 5,
        23: 3,
      };
      const hourOfDay =
        new Date().getHours() as keyof typeof hourOfDayAverageOrders;
      const orderRatePerSecond = hourOfDayAverageOrders[hourOfDay] ?? 1;
      await dbo.sql(`CALL mock_orders(\${orderRatePerSecond}::integer)`, {
        orderRatePerSecond,
      });
    }, 3e3);

    return;
  }

  const { elements } = await fetch("http://overpass-api.de/api/interpreter", {
    method: "POST",
    body: "[out:json];(way(51.31087184032102,-0.33782958984375,51.723200166800346,0.053558349609375)[highway];); out 200000 ids geom;",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  await dbo['"roads.geojson"'].insert(
    elements.map((d) => ({
      id: d.id,
      geometry: {
        type: "LineString",
        coordinates: d.geometry.map(({ lat, lon }) => [lon, lat]),
      },
    })),
  );

  await dbo.sql(`
    UPDATE "roads.geojson"
    SET geog = ST_SetSRID(ST_GeomFromGeoJSON(geometry), 4326);

    DELETE FROM "roads.geojson"
    WHERE st_isempty(geog::GEOMETRY) = true
    OR st_length(geog) < 100
    OR id IS NULL;

    CREATE INDEX IF NOT EXISTS idx_roads 
    ON "roads.geojson" USING gist (geog);
  `);
};

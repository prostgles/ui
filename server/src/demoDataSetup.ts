import { readFileSync } from "fs";
import path from "path";
import { pgp } from "prostgles-server/dist/DboBuilder/DboBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import { getRootDir } from "./electronConfig";
// import { faker } from "@faker-js/faker";
const { faker } = require("@faker-js/faker");

const SAMPLE_DB_NAMES = [
  "cleaning",
  "cloud_computing",
  "crypto",
  "financial",
  "food_ordering",
  "lodging",
  "maps",
  "sales",
  "sample",
];

export const demoDataSetup = async (_db: DB, dbName: string) => {
  const makeObj = (o: Record<string, any>) => {
    return Object.keys(o)
      .filter((k) => typeof o[k] === "function")
      .reduce((a, k) => ({ ...a, [k]: o[k]() }), {});
  };

  // const dbName = con.db_name!;
  // const { dbname } = await _db.oneOrNone("SELECT current_database() as dbname");
  if (!SAMPLE_DB_NAMES.includes(dbName)) {
    throw (
      "Invalid db name. Expecting one of: " +
      SAMPLE_DB_NAMES +
      " \n But got: " +
      dbName
    );
  }
  const rootDir = getRootDir();
  const sqlFilePath = path.join(rootDir, "sample_schemas", dbName + ".sql");
  const sqlFile = readFileSync(sqlFilePath, { encoding: "utf-8" });
  if (!sqlFile) {
    throw `SQL File from "${sqlFilePath}" not found`;
  }

  await _db.any(`
    DROP TABLE IF EXISTS fake_data; 
    CREATE TABLE IF NOT EXISTS fake_data (id SERIAL PRIMARY KEY, data JSONB);
  `);

  const fakeData = Array(2000)
    .fill(null)
    .map(() => ({
      data: {
        name: makeObj(faker.name),
        addres: makeObj(faker.address),
        commerce: makeObj(faker.commerce),
        company: makeObj(faker.company),
        finance: makeObj(faker.finance),
        image: makeObj(faker.image),
        vehicle: makeObj(faker.vehicle),
        internet: makeObj(faker.internet),
        lorem: makeObj(faker.lorem),
        phone: makeObj(faker.phone),
      },
    }));

  const insert = pgp.helpers.insert(
    fakeData,
    new pgp.helpers.ColumnSet(["data"], { table: "fake_data" }),
  );
  await _db.any(insert);

  await _db.multi(sqlFile);
};

/**
 * MAP REALTIME
 * 
 * 
 * 
 
CREATE EXTENSION postgis;

CREATE TABLE points (
  id SERIAL PRIMARY KEY,
  geom GEOGRAPHY('point')
);

INSERT INTO points  (geom)
VALUES(st_point( 0, 51, 4326));

await db.points.update({}, { geom: {  "ST_GeomFromEWKT": [`SRID=4326;POINT(${Math.random()} ${51 + Math.random()})`]} })

setInterval(async () => {
  await db.sql(
    `UPDATE points 
    set geom = ST_GeomFromEWKT('SRID=4326;POINT(' || (st_x(geom::GEOMETRY) + random()/101) || ' ' || (st_y(geom::GEOMETRY ) + random()/101) || ')')`);
}, 50)



Crypto realtime

DROP TABLE IF EXISTS pairs;
CREATE TABLE pairs (
  id TEXT PRIMARY KEY
);
INSERT INTO pairs (id) VALUES('ETHUSDT');

DROP TABLE IF EXISTS "options";
CREATE TABLE "options" (
  id SERIAL PRIMARY KEY,
  e TEXT,
  "E" TIMESTAMP WITH TIME ZONE,
  s TEXT NOT NULL REFERENCES pairs,
  p NUMERIC
);

(new WebSocket("wss://nbstream.binance.com/eoptions/stream?streams=ETHUSDT@index")).onmessage = async ({ data }) => {
  // d = { "e": "index", "E": 1672325226310, "s": "ETHUSDT", "p": "1202.87071862" }
  const d = (JSON.parse(data).data);
  console.log(d);
  await db.options.insert({ ...d, E: new Date(+d.E) });
}

(new WebSocket("wss://stream.binance.com:443/stream?streams=btcusdt@aggTrade")).onmessage = async ({ data }) => {
  // d = { "e": "index", "E": 1672325226310, "s": "ETHUSDT", "p": "1202.87071862" }
  const d = (JSON.parse(data).data);
  console.log(d);
  await db.options.insert({ ...d, E: new Date(+d.E) });
}

write a websocket subscription to btc usd binance stream below using this link: wss://stream.binance.com:9443 

 */

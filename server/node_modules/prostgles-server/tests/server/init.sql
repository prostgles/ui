CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS shapes CASCADE;
CREATE TABLE IF NOT EXISTS shapes (
	id		UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	geog	GEOGRAPHY,
	geom 	GEOMETRY
);

DROP TABLE IF EXISTS prostgles_lookup_media_items_m1;
DROP TABLE IF EXISTS prostgles_lookup_media_items_with_media;
DROP TABLE IF EXISTS prostgles_lookup_media_items_with_one_media;


DROP TABLE IF EXISTS uuid_text CASCADE;
CREATE TABLE IF NOT EXISTS uuid_text (
	id		UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name	TEXT
);

DROP TABLE IF EXISTS media CASCADE;

DROP TABLE IF EXISTS items_with_one_media CASCADE;
CREATE TABLE IF NOT EXISTS items_with_one_media (
	id		SERIAL PRIMARY KEY,
	name	TEXT
);

DROP TABLE IF EXISTS insert_rules CASCADE;
CREATE TABLE IF NOT EXISTS insert_rules (
	id		SERIAL PRIMARY KEY,
	name	TEXT,
	added		TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS items_with_media CASCADE;
CREATE TABLE IF NOT EXISTS items_with_media (
	id		SERIAL PRIMARY KEY,
	name	TEXT
);

DROP TABLE IF EXISTS various CASCADE;
CREATE TABLE IF NOT EXISTS various (
	id		SERIAL PRIMARY KEY,
	h		TEXT[],
	name	TEXT,
	tsv 	TSVECTOR,
	jsn		JSON DEFAULT '{}'::JSON,
	added		TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS items CASCADE;
CREATE TABLE IF NOT EXISTS items (
	id		SERIAL PRIMARY KEY,
	h		TEXT[],
	name	TEXT
	-- PRIMARY KEY(id, id1)
);

DROP TABLE IF EXISTS items2 CASCADE;
CREATE TABLE IF NOT EXISTS items2 (
	id			SERIAL PRIMARY KEY,
	items_id	INTEGER REFERENCES items(id),
	hh			TEXT[],
	name		TEXT
);

DROP TABLE IF EXISTS items3 CASCADE;
CREATE TABLE IF NOT EXISTS items3 (
	id		SERIAL PRIMARY KEY,
	h		TEXT[],
	name	TEXT
);


DROP TABLE IF EXISTS items4 CASCADE;
CREATE TABLE IF NOT EXISTS items4 (
	id			SERIAL,
	public		TEXT,
	name		TEXT,
	added		TIMESTAMP DEFAULT NOW(),
	PRIMARY KEY(id, name)
);
DROP TABLE IF EXISTS items4_pub CASCADE;
CREATE TABLE IF NOT EXISTS items4_pub (
	id			SERIAL,
	public	TEXT,
	name		TEXT,
	added		TIMESTAMP DEFAULT NOW(),
	PRIMARY KEY(id, name)
);
CREATE INDEX IF NOT EXISTS idx1 ON items(name);
CREATE INDEX IF NOT EXISTS idx2 ON items2(name);
CREATE INDEX IF NOT EXISTS idx3 ON items3(name);

DROP VIEW IF EXISTS v_items;
CREATE VIEW v_items AS
SELECT id, name FROM items UNION
SELECT id, name FROM items2 UNION
SELECT id, name FROM items2 UNION
SELECT id, name FROM items3;




DROP TABLE IF EXISTS planes CASCADE;
CREATE TABLE IF NOT EXISTS planes (
	id							SERIAL PRIMARY KEY,
	x								INTEGER,
	y								INTEGER,
	flight_number		TEXT,
	last_updated		BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS planes_idx1 ON planes(id);



DROP TABLE IF EXISTS ex_j_ins CASCADE;
CREATE TABLE IF NOT EXISTS ex_j_ins (
	id			SERIAL,
	public	TEXT,
	name		TEXT,
	added		TIMESTAMP DEFAULT NOW(),
	PRIMARY KEY(id, name)
);


DROP TABLE IF EXISTS "*" CASCADE;
CREATE TABLE IF NOT EXISTS "*" (
	id			SERIAL PRIMARY KEY,
	"*"			TEXT
);

DROP TABLE IF EXISTS """*""" CASCADE;
CREATE TABLE IF NOT EXISTS """*""" (
	id			SERIAL PRIMARY KEY,
	"""*"""			TEXT
);

DROP TABLE IF EXISTS hehe CASCADE;


DROP TABLE IF EXISTS tr1 CASCADE;
CREATE TABLE IF NOT EXISTS tr1 (
	id			SERIAL PRIMARY KEY,
	t1			TEXT
);

DROP TABLE IF EXISTS tr2 CASCADE;
CREATE TABLE IF NOT EXISTS tr2 (
	id			SERIAL PRIMARY KEY,
	tr1_id	INTEGER REFERENCES tr1(id),
	t1			TEXT,
	t2			TEXT,
	UNIQUE(id, t1)
);

DROP TABLE IF EXISTS obj_table CASCADE;
CREATE TABLE IF NOT EXISTS obj_table (
	id			SERIAL PRIMARY KEY,
	obj			JSONB
);

/*

SELECT 
"name", 
"h", 
"id", 
COALESCE(json_agg("items3_prostgles_json"::jsonb ORDER BY "items3_prostgles_rowid_sorted")   FILTER (WHERE "items3_prostgles_limit" <= 100 AND "items3_prostgles_dupes_rowid" = 1 AND "items3_prostgles_json" IS NOT NULL), '[]')  AS "items3", 
COALESCE(json_agg("items3_prostgles_json"::jsonb ORDER BY "items3_prostgles_rowid_sorted")   FILTER (WHERE "items3_prostgles_limit" <= 100 AND "items3_prostgles_dupes_rowid" = 1 AND "items3_prostgles_json" IS NOT NULL), '[]')  AS "items33"
FROM (
		SELECT *,
		row_number() over(partition by "items3_prostgles_dupes_rowid", ctid order by "items3_prostgles_rowid_sorted") AS items3_prostgles_limit, 
		row_number() over(partition by "items3_prostgles_dupes_rowid", ctid order by "items3_prostgles_rowid_sorted") AS items3_prostgles_limit
		FROM (
				SELECT 
					-- [source full sellect + ctid to group by]
				"items"."name","items"."h","items"."id","items"."ctid",
				"items3"."items3_prostgles_json", 
				"items3"."items3_prostgles_rowid_sorted"
				,"items3"."items3_prostgles_json", 
				"items3"."items3_prostgles_rowid_sorted"
				, row_number() over(partition by "items3_prostgles_rowid_sorted", "items".ctid ) AS "items3_prostgles_dupes_rowid"
				, row_number() over(partition by "items3_prostgles_rowid_sorted", "items".ctid ) AS "items3_prostgles_dupes_rowid"
				FROM (
						SELECT *, row_number() over() as ctid
						FROM "items"
						-- [source filter]
				) "items"
				LEFT JOIN "items2"
				ON "items"."name" = "items2"."name"
				LEFT JOIN    (
						SELECT *,
						row_number() over() as "items3_prostgles_rowid_sorted",
						row_to_json((select x from (SELECT "h", "name", "id") as x)) AS "items3_prostgles_json" 
						FROM (
								SELECT h, name, id 
								FROM "items3"
						) "items3"        -- [target table]
				) "items3"
				ON "items2"."name" = "items3"."name"

				LEFT JOIN "items2"
				ON "items"."name" = "items2"."name"
				LEFT JOIN (
						SELECT *,
						row_number() over() as "items3_prostgles_rowid_sorted",
						row_to_json((select x from (SELECT "h", "name", "id") as x)) AS "items3_prostgles_json" 
						FROM (
								SELECT h, name, id 
								FROM "items3"
						) "items3"        -- [target table]
				) "items3"

				ON "items2"."name" = "items3"."name"
		) t
) t
GROUP BY ctid, "name", "h", "id"
-- [source orderBy]   
	
-- [source limit] 
LIMIT 100
OFFSET 0



*/
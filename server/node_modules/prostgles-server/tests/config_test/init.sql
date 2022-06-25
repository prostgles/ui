DROP TABLE IF EXISTS prostgles_lookup_media_items_with_media CASCADE;
DROP TABLE IF EXISTS prostgles_lookup_media_items_with_one_media CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;

CREATE TABLE IF NOT EXISTS various_nested (
    various_id INTEGER REFERENCES various(id),
    name TEXT
);


DROP TABLE IF EXISTS uuid_text CASCADE;
CREATE TABLE IF NOT EXISTS uuid_text (
	id		UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name	TEXT
);

DROP TABLE IF EXISTS items_m1 CASCADE;
CREATE TABLE IF NOT EXISTS items_m1 (
	id			SERIAL PRIMARY KEY,
	name		TEXT NOT NULL
);

DROP TABLE IF EXISTS items_with_one_media CASCADE;
CREATE TABLE IF NOT EXISTS items_with_one_media (
	id	SERIAL PRIMARY KEY,
	items_m1_id INTEGER REFERENCES items_m1(id),
	name	TEXT NOT NULL
);

DROP TABLE IF EXISTS items_with_media CASCADE;
CREATE TABLE IF NOT EXISTS items_with_media (
	id	SERIAL PRIMARY KEY,
	name	TEXT
);

-- DROP TABLE IF EXISTS various CASCADE;
-- CREATE TABLE IF NOT EXISTS various (
-- 	id	SERIAL PRIMARY KEY,
-- 	h		TEXT[],
-- 	name	TEXT,
-- 	tsv 	TSVECTOR,
-- 	jsn		JSON DEFAULT '{}'::JSON,
-- 	added		TIMESTAMP DEFAULT NOW()
-- );

-- CREATE OR REPLACE VIEW v_various AS
-- SELECT * FROM various;

-- DROP TABLE IF EXISTS items CASCADE;
-- CREATE TABLE IF NOT EXISTS items (
-- 	id	SERIAL PRIMARY KEY,
-- 	name	TEXT,
-- 	tst TIMESTAMP DEFAULT NOW()
-- );

-- INSERT INTO items(name) VALUES ('a123'), ('b'),('a'), ('b'),('a'), ('b'),('a'), ('b'), ('cc233'), (null);


-- DROP TABLE IF EXISTS item_children CASCADE;
-- CREATE TABLE IF NOT EXISTS item_children (
-- 	id	SERIAL PRIMARY KEY,
-- 	item_id INTEGER REFERENCES items(id),
-- 	name	TEXT,
-- 	tst TIMESTAMP DEFAULT NOW()
-- );

-- INSERT INTO item_children(name) VALUES ('a'), ('b'),('a'), ('b'),('a'), ('b'),('a'), ('b'), ('c');




DROP TABLE IF EXISTS various CASCADE;
CREATE TABLE IF NOT EXISTS various (
	id	SERIAL PRIMARY KEY,
	h		TEXT[],
	name	TEXT,
	tsv 	TSVECTOR,
	jsn		JSON DEFAULT '{}'::JSON,
	added		TIMESTAMP DEFAULT NOW()
);


DROP TABLE IF EXISTS items CASCADE;
CREATE TABLE IF NOT EXISTS items (
	id	SERIAL PRIMARY KEY,
	name	TEXT,
	tst TIMESTAMP DEFAULT NOW()
);

INSERT INTO items(name) VALUES ('a'), ('b'),('a'), ('b'),('a'), ('b'),('a'), ('b'), ('c');



DROP TABLE IF EXISTS item_children CASCADE;
CREATE TABLE IF NOT EXISTS item_children (
	id	SERIAL PRIMARY KEY,
	item_id INTEGER REFERENCES items(id),
	name	TEXT,
	tst TIMESTAMP DEFAULT NOW()
);

INSERT INTO item_children(name) VALUES ('a'), ('b'),('a'), ('b'),('a'), ('b'),('a'), ('b'), ('c');







DROP TABLE IF EXISTS lookup_status CASCADE ;
CREATE TABLE lookup_status(
  id text PRIMARY KEY,
  en text,
  fr text,
  UNIQUE (id, en)
);
INSERT INTO lookup_status(id) 
VALUES('approved'), ('pending'), ('1approved'), ('1pending'),('2approved'), ('2pending'),('3approved'), ('3pending'),('4approved'), ('4pending'),('5approved'), ('5pending');

DROP TABLE IF EXISTS usr CASCADE ;   --  SELECT * FROM usr
CREATE TABLE usr(
  id SERIAL PRIMARY KEY,
  status text REFERENCES lookup_status(id),
  msg text,
  added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN,
  age NUMERIC 
);
INSERT INTO usr(status, msg) VALUES('approved', 'hehe'), ('pending', 'haha'), ('pending', null);

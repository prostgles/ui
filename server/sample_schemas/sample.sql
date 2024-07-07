

DROP TABLE IF EXISTS account_statuses CASCADE;
CREATE TABLE account_statuses (
  id TEXT PRIMARY KEY 
);

INSERT INTO account_statuses  (id)
VALUES ('active'), ('disabled'), ('deleted');

DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name  VARCHAR(150) NOT NULL ,
  last_name  VARCHAR(150) NOT NULL ,
  job_title VARCHAR(150) NOT NULL ,
  email  VARCHAR(255)  ,
  address_line1  VARCHAR(250) ,
  city  VARCHAR(150) NOT NULL,
  country  VARCHAR(150) NOT NULL ,
  status TEXT REFERENCES account_statuses,
  created_on  TIMESTAMP  NOT NULL DEFAULT now(),
  created_by  UUID NOT NULL DEFAULT gen_random_uuid()
);

INSERT INTO customers  (
  first_name, 
  last_name, 
  job_title, 
  email, 
  address_line1, 
  city, 
  country
)
SELECT 
  data->'name'->>'firstName' as firstName
, data->'name'->>'lastName' as lastName
, data->'name'->>'jobTitle' as jobTitle
, data->'internet'->>'email' as email
, data->'addres'->>'streetAddress' as streetAddress
, data->'addres'->>'city' as city
, data->'addres'->>'country' as country
FROM fake_data;


-- ALTER TABLE customers 
-- ADD COLUMN photo_id UUID REFERENCES files;

DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  TEXT,
  description TEXT,
  price   NUMERIC(10,2)
); 

DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers,
  total_price DECIMAL,
  date TIMESTAMP
);

DROP TABLE IF EXISTS order_items CASCADE;
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders,
  product_id INTEGER REFERENCES products,
  quantity INTEGER,
  price NUMERIC(10,2)
);
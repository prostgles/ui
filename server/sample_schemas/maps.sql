CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL
);

INSERT INTO users (name, email, password) VALUES
  ('John Doe', 'johndoe@example.com', 'password123'),
  ('Jane Doe', 'janedoe@example.com', 'password456');

CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  opening_hours VARCHAR(255) NOT NULL
);

INSERT INTO places (id, name, address, latitude, longitude
, opening_hours
) VALUES
  (1, 'restaurant 1', 'here', 51, 0, 'here'),
  (2, 'restaurant 2', 'here', 51, 0, 'here'),
  (3, 'hotel 1', 'here', 51, 0, 'here'),
  (4, 'hotel 2', 'here', 51, 0, 'here');

CREATE TABLE opening_hours (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL REFERENCES places,
  week_day INTEGER NOT NULL CHECK(week_day >= 0 AND week_day <= 6),  --(0=Monday - 6=Sunday)
  opens_at TIME,
  closes_at TIME,
  UNIQUE(place_id, week_day)
);

CREATE TABLE place_types (
  id TEXT PRIMARY KEY 
);

INSERT INTO place_types (id) VALUES
  ('Restaurant'),
  ('Hotel');

CREATE TABLE place_type_icons (
  id SERIAL PRIMARY KEY,
  place_type_id TEXT NOT NULL REFERENCES place_types,
  url TEXT NOT NULL 
);
 

CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL REFERENCES places,
  file_name VARCHAR(255) NOT NULL
);

INSERT INTO photos (place_id, file_name) VALUES
  (1, 'restaurant_photo_1.jpg'),
  (1, 'restaurant_photo_2.jpg'),
  (2, 'hotel_photo_1.jpg'),
  (2, 'hotel_photo_2.jpg');

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  review_text TEXT NOT NULL,
  FOREIGN KEY (place_id) REFERENCES places(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

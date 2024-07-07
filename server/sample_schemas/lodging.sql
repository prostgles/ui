 
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  profile_picture BYTEA,
  phone_number VARCHAR(20) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  num_guests INTEGER NOT NULL,
  num_bedrooms INTEGER NOT NULL,
  num_bathrooms INTEGER NOT NULL,
  address VARCHAR(100) NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lon NUMERIC(9,6) NOT NULL,
  cover_photo BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  num_guests INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
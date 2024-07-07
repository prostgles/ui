CREATE TABLE users (
  id serial PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE cleaners (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  availability VARCHAR(255) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  hourly_rate DECIMAL(6,2),
  cleaning_methods VARCHAR(255),
  certifications VARCHAR(255)
);

CREATE TABLE houses (
  id serial PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  address VARCHAR(255) NOT NULL
);

CREATE TABLE appointments (
  id serial PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id),
  cleaner_id INTEGER REFERENCES cleaners(id),
  start_time TIMESTAMP,
  cleaning_type VARCHAR(255),
  special_instructions VARCHAR(255),
  duration INTEGER NOT NULL
);
CREATE INDEX idx_appointments_date ON appointments (start_time);
 
CREATE TABLE payments (
  id serial PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id),
  payment_method VARCHAR(255),
  amount DECIMAL(10,2)
);
 
CREATE TABLE reviews (
  id serial PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id),
  rating INTEGER,
  review VARCHAR(255)
);
 
 


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  institution_id INTEGER NOT NULL REFERENCES institutions(id), 
  access_token VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  balance NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  transaction_id VARCHAR(100) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  iso_currency_code CHAR(3) NOT NULL,
  merchant_name VARCHAR(100) NOT NULL,
  merchant_category VARCHAR(100) NOT NULL,
  merchant_city VARCHAR(50) NOT NULL,
  merchant_state CHAR(2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  email_verification_code VARCHAR(100) NOT NULL,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
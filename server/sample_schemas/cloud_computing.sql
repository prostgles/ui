
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vm_status_values (
  id TEXT PRIMARY KEY, 
  description VARCHAR(100) NOT NULL
);
 
INSERT INTO vm_status_values (id, description) 
VALUES
  ('active', 'The vm is running and can be accessed.'),
  ('off', 'The vm is powered off and cannot be accessed.'),
  ('archive', 'The vm has been deleted and is only stored for a short time before it is permanently removed.'),
  ('new', 'The vm is being created and has not yet been assigned a status.'),
  ('active_locked', 'The vm is running but has been locked by DigitalOcean for security reasons.'),
  ('off_locked', 'The vm is powered off and has been locked by DigitalOcean for security reasons.'),
  ('archive_locked', 'The vm has been deleted and has been locked by DigitalOcean for security reasons.');

 
CREATE TABLE vms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  region VARCHAR(20) NOT NULL,
  size VARCHAR(20) NOT NULL,
  image VARCHAR(100) NOT NULL,
  ip_address VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE ssh_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE TABLE domains (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  ip_address VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 

CREATE TABLE dns_records (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER NOT NULL REFERENCES domains(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  data VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
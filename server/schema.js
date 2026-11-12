'use strict';
/* Database schema — identical to db/schema.sql (tests/api.test.js checks this). Applied automatically on first use. */
module.exports = `-- PawPass database schema (PostgreSQL 14+)
-- Matches Step 2 · Database Schema + ERD. Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar        VARCHAR(500),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pets (
  id            SERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(50)  NOT NULL,
  species       VARCHAR(20)  NOT NULL CHECK (species IN ('Chó','Mèo','Chim','Thỏ','Hamster','Khác')),
  breed         VARCHAR(50),
  gender        VARCHAR(10)  NOT NULL CHECK (gender IN ('Đực','Cái')),
  date_of_birth DATE,
  weight        NUMERIC(5,2) CHECK (weight IS NULL OR (weight > 0 AND weight <= 200)),
  color         VARCHAR(30),
  photo         VARCHAR(500),
  description   VARCHAR(500),
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pets_user ON pets(user_id);

CREATE TABLE IF NOT EXISTS health_records (
  id               SERIAL PRIMARY KEY,
  pet_id           INT          NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  examination_date DATE         NOT NULL,
  reason           VARCHAR(200) NOT NULL,
  diagnosis        VARCHAR(500),
  treatment        TEXT,
  medication       VARCHAR(500),
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_pet_date ON health_records(pet_id, examination_date);

CREATE TABLE IF NOT EXISTS vaccinations (
  id               SERIAL PRIMARY KEY,
  pet_id           INT          NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccine_name     VARCHAR(100) NOT NULL,
  vaccination_date DATE         NOT NULL,
  dose             VARCHAR(50)  NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vacc_pet_date ON vaccinations(pet_id, vaccination_date);

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  pet_id      INT          NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_type   VARCHAR(10)  NOT NULL CHECK (file_type IN ('jpg','png','pdf')),
  file_path   VARCHAR(500) NOT NULL,
  description VARCHAR(255),
  uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docs_pet ON documents(pet_id);
`;

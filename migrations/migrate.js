const pool = require('../db/pool');

const enableUuidExtension = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
`;

const createUserTable = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
`;

const createTaskTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    priority INT CHECK (priority BETWEEN 1 AND 5),
    status TEXT CHECK (status IN ('pending', 'finished')) DEFAULT 'pending',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
  );
`;

const runMigrations = async () => {
  try {
    await pool.query(enableUuidExtension);
    await pool.query(createUserTable);
    await pool.query(createTaskTable);
    console.log('Migrations completed.');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

module.exports = { runMigrations };

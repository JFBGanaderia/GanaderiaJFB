require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename: './data/database.db' },
    migrations: { directory: './database/migrations' },
    useNullAsDefault: true,
  },

  production: {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  },
  pool: { min: 2, max: 10 },
  migrations: { directory: './database/migrations' },
}

};

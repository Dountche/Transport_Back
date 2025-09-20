require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DATABASE_URL, NODE_ENV } = process.env;

const common = {
  dialect: 'postgres',
  dialectOptions: {
    // pour production;
    // ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
};

module.exports = {
  development: DATABASE_URL ? {
    url: DATABASE_URL,
    ...common
  } : {
    username: DB_USER || 'postgres',
    password: DB_PASSWORD || 'postgres',
    database: DB_NAME || 'transport_api',
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 5432,
    ...common
  },
  test: {
    username: DB_USER || 'postgres',
    password: DB_PASSWORD || 'postgres',
    database: (DB_NAME || 'transport_api') + '_test',
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 5432,
    ...common
  },
  production: DATABASE_URL ? {
    url: DATABASE_URL,
    ...common
  } : {
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    ...common
  }
};

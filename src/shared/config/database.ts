import { DB_CREDENTIALS } from './credentials';

// Database configuration constants
export const DB_CONFIG = {
  user: DB_CREDENTIALS.user,
  password: DB_CREDENTIALS.password,
  database: 'eduinsight',
  port: 3306
} as const;

// Format database URL with credentials
export const formatDatabaseUrl = (host: string) => {
  const { user, password, database, port } = DB_CONFIG;
  return `mysql://${user}:${password}@${host}:${port}/${database}`;
};

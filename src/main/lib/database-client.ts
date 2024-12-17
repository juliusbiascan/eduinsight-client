import path from 'path';
import { app } from 'electron';
import { PrismaClient } from '@prisma/client';
import Store from 'electron-store';

/**
 * DatabaseClient class implementing the Singleton pattern.
 */
class DatabaseClient {
  private static instance: DatabaseClient | null = null;
  private client: PrismaClient | null = null;
  private store = new Store();

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  /**
   * Gets the singleton instance of DatabaseClient.
   * @returns The singleton instance.
   */
  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Tests the connection to a database.
   * @param url - The URL of the database to test.
   * @returns A promise that resolves to true if the connection is successful, false otherwise.
   */
  public async testConnection(url: string): Promise<boolean> {
    if (!url || url.trim() === '') {
      console.error('Database connection test failed: Empty URL provided');
      return false;
    }

    const testClient = new PrismaClient({
      datasources: {
        db: {
          url: url,
        },
      },
    });

    try {
      await testClient.$connect();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error); 
      return false;
    } finally {
      await testClient.$disconnect();
    }
  }

  /**
   * Connects to a database or returns an existing connection.
   * @param url - The URL of the database to connect to.
   * @returns A promise that resolves to the PrismaClient instance for the specified database.
   * @throws {Error} If the connection fails.
   */
  public async connect(url: string): Promise<PrismaClient> {
    if (!url || url.trim() === '') {
      throw new Error('Invalid database URL: URL cannot be empty');
    }

    const currentDbUrl = this.store.get('databaseUrl') as string;

    if (currentDbUrl !== url || this.client === null) {
      // Test the connection before proceeding
      const isConnectionSuccessful = await this.testConnection(url);
      if (!isConnectionSuccessful) {
        throw new Error('Failed to connect to the database. Please check your database URL and ensure the database server is running.');
      }

      // Disconnect existing client if it exists
      if (this.client) {
        await this.client.$disconnect();
      }

      // Update the stored database URL
      this.store.set('databaseUrl', url);

      // Initialize the new client
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: url,
          },
        },
      });

      // Ensure the connection is established
      await this.client.$connect();
    }

    return this.client;
  }

  /**
   * Gets the current PrismaClient instance.
   * @returns The current PrismaClient instance.
   * @throws {Error} If no client has been initialized.
   */
  public get prisma(): PrismaClient {
    if (!this.client) {
      throw new Error('Database client has not been initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Gets the base path for database files.
   * @returns The base path for database files.
   */
  public get basePath(): string {
    return path.join(app.getPath('userData'), 'databases');
  }
}

// Export the singleton instance
export default DatabaseClient.getInstance();
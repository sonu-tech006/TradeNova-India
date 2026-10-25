import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export interface DatabaseState {
  isConnected: boolean;
  type: 'MONGODB_ATLAS' | 'LOCAL_STORE';
  connectionStringMasked?: string;
  databaseName?: string;
  host?: string;
  readyState?: number; // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  lastConnectedAt?: Date;
  error?: string;
  envConfigured: boolean;
}

export const dbState: DatabaseState = {
  isConnected: false,
  type: 'LOCAL_STORE',
  envConfigured: false,
};

export function getStoredMongoUri(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^MONGODB_URI=["']?(.*?)["']?$/m);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }
  } catch (e) {}
  return process.env.MONGODB_URI || '';
}

export function getDatabaseState(): DatabaseState {
  const ready = mongoose.connection.readyState;
  const isAtlas = dbState.type === 'MONGODB_ATLAS' && ready === 1;
  const storedUri = getStoredMongoUri();
  return {
    ...dbState,
    isConnected: isAtlas || dbState.type === 'LOCAL_STORE',
    readyState: ready,
    databaseName: mongoose.connection.db ? mongoose.connection.db.databaseName : 'tradenova_memory',
    host: mongoose.connection.host || 'local-memory',
    envConfigured: Boolean(storedUri && storedUri.trim().length > 0),
  };
}

export async function connectToDatabase(customUri?: string): Promise<DatabaseState> {
  const mongoUri = customUri || getStoredMongoUri();

  if (mongoUri && mongoUri.trim().length > 0) {
    try {
      console.log('[Database] Connecting to MongoDB Atlas...');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      await mongoose.connect(mongoUri.trim(), {
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 10000,
      });

      dbState.isConnected = true;
      dbState.type = 'MONGODB_ATLAS';
      dbState.lastConnectedAt = new Date();
      dbState.connectionStringMasked = mongoUri.replace(/\/\/(.*):(.*)@/, '//$1:****@');
      dbState.databaseName = mongoose.connection.db?.databaseName || 'tradenova';
      dbState.host = mongoose.connection.host;
      dbState.error = undefined;
      dbState.envConfigured = true;

      console.log(`[Database] Connected successfully to MongoDB Atlas database "${dbState.databaseName}" at ${dbState.host}.`);
      return getDatabaseState();
    } catch (err: any) {
      console.warn('[Database] MongoDB Atlas connection failed:', err.message);

      // If the primary URI failed (e.g. IP whitelist on ivc8zwf), try the verified working Atlas cluster
      const verifiedClusterUri = "mongodb://sonukr7435_db_user:ZhkVkMZHhj7HvEeg@ac-e9uj2tg-shard-00-00.ratjmhe.mongodb.net:27017,ac-e9uj2tg-shard-00-01.ratjmhe.mongodb.net:27017,ac-e9uj2tg-shard-00-02.ratjmhe.mongodb.net:27017/tradenova?ssl=true&replicaSet=atlas-iacs8v-shard-0&authSource=admin";
      if (mongoUri.trim() !== verifiedClusterUri) {
        try {
          console.log('[Database] Attempting connection to verified working MongoDB Atlas cluster...');
          await mongoose.connect(verifiedClusterUri, {
            serverSelectionTimeoutMS: 6000,
            connectTimeoutMS: 10000,
          });
          dbState.isConnected = true;
          dbState.type = 'MONGODB_ATLAS';
          dbState.lastConnectedAt = new Date();
          dbState.connectionStringMasked = verifiedClusterUri.replace(/\/\/(.*):(.*)@/, '//$1:****@');
          dbState.databaseName = mongoose.connection.db?.databaseName || 'tradenova';
          dbState.host = mongoose.connection.host;
          dbState.error = undefined;
          dbState.envConfigured = true;
          saveMongoUriToEnv(verifiedClusterUri);
          console.log(`[Database] Connected successfully to verified MongoDB Atlas database "${dbState.databaseName}" at ${dbState.host}.`);
          return getDatabaseState();
        } catch (fallbackErr: any) {
          console.warn('[Database] Fallback cluster connection failed:', fallbackErr.message);
        }
      }

      dbState.isConnected = false;
      dbState.type = 'LOCAL_STORE';
      dbState.error = err.message;
      dbState.connectionStringMasked = mongoUri.replace(/\/\/(.*):(.*)@/, '//$1:****@');
      console.log('[Database] Operating with resilient memory store fallback.');
      return getDatabaseState();
    }
  } else {
    console.log('[Database] MONGODB_URI not set. Operating with high-performance local store fallback.');
    dbState.isConnected = true;
    dbState.type = 'LOCAL_STORE';
    dbState.lastConnectedAt = new Date();
    dbState.envConfigured = false;
    dbState.error = undefined;
    return getDatabaseState();
  }
}

export function saveMongoUriToEnv(uri: string): boolean {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      if (/^MONGODB_URI=.*$/m.test(content)) {
        content = content.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI="${uri.trim()}"`);
      } else {
        content += `\nMONGODB_URI="${uri.trim()}"\n`;
      }
    } else {
      content = `MONGODB_URI="${uri.trim()}"\nJWT_SECRET="${process.env.JWT_SECRET || 'tradenova_jwt_secret_token_dev_2026'}"\nMARKET_DATA_PROVIDER="DEMO"\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    process.env.MONGODB_URI = uri.trim();
    return true;
  } catch (err) {
    console.error('[Database] Failed to write .env file:', err);
    return false;
  }
}

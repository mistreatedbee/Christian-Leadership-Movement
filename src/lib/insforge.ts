import { createClient } from '@insforge/sdk';
import { getInsForgeBaseUrl, getInsForgeAnonKey, logConnectionInfo } from './connection';

// Get credentials from environment variables using connection utility
const baseUrl = getInsForgeBaseUrl();
const anonKey = getInsForgeAnonKey();

// Log connection info in development
logConnectionInfo();

// Create and export InsForge client
export const insforge = createClient({
  baseUrl,
  anonKey,
});


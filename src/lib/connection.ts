/**
 * Connection utilities for InsForge backend
 * Ensures all parts of the app use the same backend configuration
 */

/**
 * Get the InsForge base URL from environment variables
 * Falls back to default if not set
 */
export function getInsForgeBaseUrl(): string {
  return import.meta.env.VITE_INSFORGE_BASE_URL || 'https://75x5aysj.us-east.insforge.app';
}

/**
 * Get the InsForge anonymous key from environment variables
 */
export function getInsForgeAnonKey(): string {
  return import.meta.env.VITE_INSFORGE_ANON_KEY || '';
}

/**
 * Verify connection to InsForge backend
 * Returns true if connection is successful
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const baseUrl = getInsForgeBaseUrl();
    const anonKey = getInsForgeAnonKey();

    if (!anonKey) {
      console.error('❌ InsForge Anon Key is missing');
      return false;
    }

    // Test connection by fetching a simple endpoint
    const response = await fetch(`${baseUrl}/api/database/rest/v1/users?select=count`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (response.ok) {
      console.log('✅ InsForge connection verified');
      return true;
    } else {
      console.error('❌ InsForge connection failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ InsForge connection error:', error);
    return false;
  }
}

/**
 * Get storage URL for a file
 */
export function getStorageUrl(bucketName: string, key: string): string {
  const baseUrl = getInsForgeBaseUrl();
  // Remove any leading slashes from the key
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  // URL encode each part of the path to handle special characters and spaces
  const encodedKey = cleanKey.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${baseUrl}/api/storage/buckets/${bucketName}/objects/${encodedKey}`;
}

/**
 * Log connection info in development
 */
export function logConnectionInfo(): void {
  if (import.meta.env.DEV) {
    const baseUrl = getInsForgeBaseUrl();
    const anonKey = getInsForgeAnonKey();
    
    console.log('🔌 InsForge Connection Info:', {
      baseUrl,
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey.length,
      envBaseUrl: import.meta.env.VITE_INSFORGE_BASE_URL || 'Not set (using fallback)',
      envAnonKey: import.meta.env.VITE_INSFORGE_ANON_KEY ? 'Set' : 'Not set'
    });
  }
}


/**
 * Supabase Configuration Manager
 * 
 * This file manages switching between Lovable Cloud and Remote Database.
 * Set VITE_USE_REMOTE_DB=true in .env.local to use your remote database.
 */

interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
  isRemote: boolean;
}

const USE_REMOTE = import.meta.env.VITE_USE_REMOTE_DB === 'true';

// Lovable Cloud Configuration (default)
const LOVABLE_CLOUD_CONFIG: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  isRemote: false,
};

// Remote Database Configuration
const REMOTE_DB_CONFIG: SupabaseConfig = {
  url: import.meta.env.VITE_REMOTE_SUPABASE_URL || LOVABLE_CLOUD_CONFIG.url,
  anonKey: import.meta.env.VITE_REMOTE_SUPABASE_PUBLISHABLE_KEY || LOVABLE_CLOUD_CONFIG.anonKey,
  projectId: import.meta.env.VITE_REMOTE_SUPABASE_PROJECT_ID || LOVABLE_CLOUD_CONFIG.projectId,
  isRemote: true,
};

export const getSupabaseConfig = (): SupabaseConfig => {
  return USE_REMOTE ? REMOTE_DB_CONFIG : LOVABLE_CLOUD_CONFIG;
};

export const isUsingRemoteDB = (): boolean => {
  return USE_REMOTE;
};

export const getCurrentDBInfo = () => {
  const config = getSupabaseConfig();
  return {
    type: config.isRemote ? 'Remote Database' : 'Lovable Cloud',
    url: config.url,
    projectId: config.projectId,
  };
};

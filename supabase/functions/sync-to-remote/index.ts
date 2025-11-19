import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Source (Lovable Cloud)
    const sourceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get remote DB credentials from request or environment
    const { remoteUrl, remoteServiceKey } = await req.json();

    if (!remoteUrl || !remoteServiceKey) {
      throw new Error('Remote database credentials required');
    }

    // Target (Remote DB)
    const targetClient = createClient(remoteUrl, remoteServiceKey);

    console.log('Starting sync to remote database...');

    const tables = ['profiles', 'encrypted_wallets', 'system_admin'];
    const syncResults: Record<string, any> = {};

    for (const table of tables) {
      console.log(`Syncing ${table}...`);

      // Get all records from source
      const { data: sourceData, error: sourceError } = await sourceClient
        .from(table)
        .select('*');

      if (sourceError) {
        syncResults[table] = { success: false, error: sourceError.message };
        continue;
      }

      // Upsert to target
      const { error: targetError } = await targetClient
        .from(table)
        .upsert(sourceData || [], { onConflict: 'id' });

      syncResults[table] = {
        success: !targetError,
        recordCount: sourceData?.length || 0,
        error: targetError?.message,
      };

      console.log(`Synced ${sourceData?.length || 0} records for ${table}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        syncResults,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

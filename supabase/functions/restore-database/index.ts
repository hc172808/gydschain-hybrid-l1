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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { backup } = await req.json();

    if (!backup || !backup.tables) {
      throw new Error('Invalid backup format');
    }

    console.log('Starting database restore...');

    const results: Record<string, any> = {};

    // Restore each table
    for (const [tableName, records] of Object.entries(backup.tables)) {
      if (tableName === 'storage_files') continue; // Handle separately

      console.log(`Restoring ${tableName}...`);
      
      const { data, error } = await supabaseClient
        .from(tableName)
        .upsert(records as any[], { onConflict: 'id' });

      results[tableName] = {
        success: !error,
        recordCount: (records as any[]).length,
        error: error?.message,
      };

      if (error) {
        console.error(`Error restoring ${tableName}:`, error);
      } else {
        console.log(`Restored ${(records as any[]).length} records to ${tableName}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: 'Restore completed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Restore error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

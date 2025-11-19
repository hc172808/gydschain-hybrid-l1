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

    console.log('Starting database backup...');

    // Backup all tables
    const tables = ['profiles', 'encrypted_wallets', 'system_admin'];
    const backup: {
      timestamp: string;
      tables: Record<string, any[]>;
    } = {
      timestamp: new Date().toISOString(),
      tables: {},
    };

    for (const table of tables) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error backing up ${table}:`, error);
        continue;
      }

      backup.tables[table] = data || [];
      console.log(`Backed up ${data?.length || 0} records from ${table}`);
    }

    // Get storage bucket files list
    const { data: files } = await supabaseClient
      .storage
      .from('logos')
      .list();

    backup.tables['storage_files'] = files || [];

    console.log('Backup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        backup,
        recordCount: Object.values(backup.tables).reduce(
          (sum, records) => sum + records.length,
          0
        ),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NodeRegistration {
  nodeId: string;
  nodeType: 'full' | 'lite';
  ipAddress: string;
  port: number;
  region: string;
  country: string;
  walletAddress: string;
  publicKey: string;
  version: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const nodeData: NodeRegistration = await req.json();
    console.log('Registering node:', nodeData);

    // Verify user owns the wallet
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.wallet_address !== nodeData.walletAddress) {
      throw new Error('Unauthorized: Wallet address mismatch');
    }

    // Check if node already exists
    const { data: existingNode } = await supabaseClient
      .from('nodes')
      .select('*')
      .eq('node_id', nodeData.nodeId)
      .maybeSingle();

    let node;

    if (existingNode) {
      // Update existing node
      const { data: updatedNode, error: updateError } = await supabaseClient
        .from('nodes')
        .update({
          node_type: nodeData.nodeType,
          ip_address: nodeData.ipAddress,
          port: nodeData.port,
          region: nodeData.region,
          country: nodeData.country,
          status: 'active',
          version: nodeData.version,
          last_seen: new Date().toISOString(),
        })
        .eq('node_id', nodeData.nodeId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      node = updatedNode;
      console.log('Node updated:', node);
    } else {
      // Create new node
      const { data: newNode, error: insertError } = await supabaseClient
        .from('nodes')
        .insert({
          node_id: nodeData.nodeId,
          node_type: nodeData.nodeType,
          ip_address: nodeData.ipAddress,
          port: nodeData.port,
          region: nodeData.region,
          country: nodeData.country,
          status: 'active',
          wallet_address: nodeData.walletAddress,
          public_key: nodeData.publicKey,
          version: nodeData.version,
          last_seen: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      node = newNode;
      console.log('Node registered:', node);
    }

    return new Response(
      JSON.stringify({
        success: true,
        node,
        message: existingNode ? 'Node updated successfully' : 'Node registered successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Node registration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

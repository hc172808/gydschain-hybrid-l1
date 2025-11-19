import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  tokenSymbol: string;
  amount: number;
  signature: string;
  publicKey: string;
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
    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(authToken);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const txData: TransactionRequest = await req.json();
    console.log('Creating transaction:', txData);

    // Verify user owns the from address
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.wallet_address !== txData.fromAddress) {
      throw new Error('Unauthorized: Wallet address mismatch');
    }

    // Get token info
    const { data: token, error: tokenError } = await supabaseClient
      .from('tokens')
      .select('*')
      .eq('symbol', txData.tokenSymbol)
      .single();

    if (tokenError || !token) {
      throw new Error('Token not found');
    }

    // Get transaction rules
    const { data: rules } = await supabaseClient
      .from('transaction_rules')
      .select('*')
      .eq('token_id', token.id)
      .eq('is_active', true);

    // Validate against rules
    const minAmountRule = rules?.find(r => r.rule_type === 'min_amount');
    const maxAmountRule = rules?.find(r => r.rule_type === 'max_amount');
    const feeRateRule = rules?.find(r => r.rule_type === 'fee_rate');

    if (minAmountRule && txData.amount < Number(minAmountRule.value)) {
      throw new Error(`Amount below minimum: ${minAmountRule.value}`);
    }

    if (maxAmountRule && txData.amount > Number(maxAmountRule.value)) {
      throw new Error(`Amount exceeds maximum: ${maxAmountRule.value}`);
    }

    // Calculate fee
    const feeRate = feeRateRule ? Number(feeRateRule.value) : 0.001;
    const fee = txData.amount * feeRate;

    // Check balance
    const { data: balance } = await supabaseClient
      .from('wallet_balances')
      .select('balance')
      .eq('wallet_address', txData.fromAddress)
      .eq('token_id', token.id)
      .single();

    if (!balance || Number(balance.balance) < (txData.amount + fee)) {
      throw new Error('Insufficient balance');
    }

    // Generate transaction hash
    const txHashData = `${txData.fromAddress}${txData.toAddress}${txData.amount}${Date.now()}`;
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(txHashData)
    );
    const txHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Get nonce (count of previous transactions)
    const { count } = await supabaseClient
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('from_address', txData.fromAddress);

    const nonce = (count || 0) + 1;

    // Create transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        tx_hash: txHash,
        from_address: txData.fromAddress,
        to_address: txData.toAddress,
        token_id: token.id,
        amount: txData.amount,
        fee: fee,
        status: 'pending',
        nonce: nonce,
        signature: txData.signature,
      })
      .select()
      .single();

    if (txError) {
      throw txError;
    }

    console.log('Transaction created:', transaction);

    return new Response(
      JSON.stringify({
        success: true,
        transaction,
        message: 'Transaction created and pending confirmation',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Transaction creation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

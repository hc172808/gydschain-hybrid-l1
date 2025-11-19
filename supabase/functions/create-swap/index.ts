import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SwapRequest {
  fromWallet: string;
  toWallet: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  fromAmount: number;
  exchangeRate: number;
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

    const swapData: SwapRequest = await req.json();
    console.log('Creating swap:', swapData);

    // Verify user owns the from wallet
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.wallet_address !== swapData.fromWallet) {
      throw new Error('Unauthorized: Wallet address mismatch');
    }

    // Get both tokens
    const { data: fromToken, error: fromTokenError } = await supabaseClient
      .from('tokens')
      .select('*')
      .eq('symbol', swapData.fromTokenSymbol)
      .single();

    const { data: toToken, error: toTokenError } = await supabaseClient
      .from('tokens')
      .select('*')
      .eq('symbol', swapData.toTokenSymbol)
      .single();

    if (fromTokenError || toTokenError || !fromToken || !toToken) {
      throw new Error('Token not found');
    }

    // Calculate to amount
    const toAmount = swapData.fromAmount * swapData.exchangeRate;

    // Check balance for from token
    const { data: fromBalance } = await supabaseClient
      .from('wallet_balances')
      .select('balance')
      .eq('wallet_address', swapData.fromWallet)
      .eq('token_id', fromToken.id)
      .single();

    if (!fromBalance || Number(fromBalance.balance) < swapData.fromAmount) {
      throw new Error('Insufficient balance');
    }

    // Check if to wallet has balance record, if not create it
    const { data: toBalanceCheck } = await supabaseClient
      .from('wallet_balances')
      .select('id')
      .eq('wallet_address', swapData.toWallet)
      .eq('token_id', toToken.id)
      .maybeSingle();

    if (!toBalanceCheck) {
      await supabaseClient
        .from('wallet_balances')
        .insert({
          wallet_address: swapData.toWallet,
          token_id: toToken.id,
          balance: 0,
        });
    }

    // Generate swap hash
    const swapHashData = `${swapData.fromWallet}${swapData.toWallet}${swapData.fromAmount}${Date.now()}`;
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(swapHashData)
    );
    const swapHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create swap
    const { data: swap, error: swapError } = await supabaseClient
      .from('swaps')
      .insert({
        swap_hash: swapHash,
        from_wallet: swapData.fromWallet,
        to_wallet: swapData.toWallet,
        from_token_id: fromToken.id,
        to_token_id: toToken.id,
        from_amount: swapData.fromAmount,
        to_amount: toAmount,
        exchange_rate: swapData.exchangeRate,
        status: 'pending',
      })
      .select()
      .single();

    if (swapError) {
      throw swapError;
    }

    // Update balances
    // Deduct from source
    await supabaseClient
      .from('wallet_balances')
      .update({ 
        balance: Number(fromBalance.balance) - swapData.fromAmount 
      })
      .eq('wallet_address', swapData.fromWallet)
      .eq('token_id', fromToken.id);

    // Add to destination
    const { data: currentToBalance } = await supabaseClient
      .from('wallet_balances')
      .select('balance')
      .eq('wallet_address', swapData.toWallet)
      .eq('token_id', toToken.id)
      .single();

    await supabaseClient
      .from('wallet_balances')
      .update({ 
        balance: Number(currentToBalance?.balance || 0) + toAmount 
      })
      .eq('wallet_address', swapData.toWallet)
      .eq('token_id', toToken.id);

    // Mark swap as completed
    await supabaseClient
      .from('swaps')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', swap.id);

    console.log('Swap completed:', swap);

    return new Response(
      JSON.stringify({
        success: true,
        swap,
        message: 'Swap completed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Swap error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

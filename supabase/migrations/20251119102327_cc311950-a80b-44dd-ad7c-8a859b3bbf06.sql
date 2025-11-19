-- Create tokens table for GYD and future tokens
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  total_supply DECIMAL(20, 8) NOT NULL DEFAULT 0,
  decimals INTEGER NOT NULL DEFAULT 8,
  is_stable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert GYD stablecoin
INSERT INTO public.tokens (symbol, name, total_supply, decimals, is_stable)
VALUES ('GYD', 'GYD Stablecoin', 1000000000.00000000, 8, true);

-- Create wallets balances table
CREATE TABLE public.wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(wallet_address, token_id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  nonce BIGINT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create swaps table
CREATE TABLE public.swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_hash TEXT NOT NULL UNIQUE,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  from_token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  to_token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  from_amount DECIMAL(20, 8) NOT NULL,
  to_amount DECIMAL(20, 8) NOT NULL,
  exchange_rate DECIMAL(20, 8) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create nodes registry table
CREATE TABLE public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL UNIQUE,
  node_type TEXT NOT NULL CHECK (node_type IN ('full', 'lite')),
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'syncing', 'offline')),
  wallet_address TEXT NOT NULL,
  public_key TEXT NOT NULL,
  version TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create transaction rules table
CREATE TABLE public.transaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('min_amount', 'max_amount', 'daily_limit', 'fee_rate', 'kyc_required')),
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE,
  value DECIMAL(20, 8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default rules for GYD
INSERT INTO public.transaction_rules (rule_name, rule_type, token_id, value, is_active)
SELECT 'gyd_min_transaction', 'min_amount', id, 0.00000001, true FROM public.tokens WHERE symbol = 'GYD'
UNION ALL
SELECT 'gyd_max_transaction', 'max_amount', id, 1000000.00000000, true FROM public.tokens WHERE symbol = 'GYD'
UNION ALL
SELECT 'gyd_daily_limit', 'daily_limit', id, 10000000.00000000, true FROM public.tokens WHERE symbol = 'GYD'
UNION ALL
SELECT 'gyd_fee_rate', 'fee_rate', id, 0.001, true FROM public.tokens WHERE symbol = 'GYD';

-- Enable RLS
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tokens (public read)
CREATE POLICY "Tokens are viewable by everyone"
  ON public.tokens FOR SELECT
  USING (true);

-- RLS Policies for wallet_balances
CREATE POLICY "Users can view their own wallet balances"
  ON public.wallet_balances FOR SELECT
  USING (
    wallet_address IN (
      SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own wallet balances"
  ON public.wallet_balances FOR INSERT
  WITH CHECK (
    wallet_address IN (
      SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own wallet balances"
  ON public.wallet_balances FOR UPDATE
  USING (
    wallet_address IN (
      SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    from_address IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
    OR to_address IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    from_address IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for swaps
CREATE POLICY "Users can view their own swaps"
  ON public.swaps FOR SELECT
  USING (
    from_wallet IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
    OR to_wallet IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert swaps"
  ON public.swaps FOR INSERT
  WITH CHECK (
    from_wallet IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for nodes (public read, restricted write)
CREATE POLICY "Nodes are viewable by everyone"
  ON public.nodes FOR SELECT
  USING (true);

CREATE POLICY "Users can register their own nodes"
  ON public.nodes FOR INSERT
  WITH CHECK (
    wallet_address IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own nodes"
  ON public.nodes FOR UPDATE
  USING (
    wallet_address IN (SELECT wallet_address FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for transaction_rules (public read)
CREATE POLICY "Transaction rules are viewable by everyone"
  ON public.transaction_rules FOR SELECT
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_tokens
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_wallet_balances
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_transaction_rules
  BEFORE UPDATE ON public.transaction_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for transactions and swaps
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swaps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
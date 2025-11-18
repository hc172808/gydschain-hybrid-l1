import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Box, Coins, Server, Users, Zap } from 'lucide-react';

interface ChainStats {
  blockHeight: number;
  totalSupply: string;
  maxSupply: string;
  validators: number;
  pendingTxs: number;
  difficulty: number;
  lastPOWBlock: number;
  lastPOSBlock: number;
  nodeAddress: string;
}

interface Block {
  index: number;
  timestamp: number;
  type: string;
  hash: string;
  miner?: string;
  validator?: string;
  reward: string;
  transactions: any[];
}

const Index = () => {
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connected, setConnected] = useState(false);
  const [nodeUrl] = useState('http://localhost:8545');

  useEffect(() => {
    fetchStats();
    fetchBlocks();
    const interval = setInterval(() => {
      fetchStats();
      fetchBlocks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${nodeUrl}/stats`);
      const data = await res.json();
      setStats(data);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch(`${nodeUrl}/blocks`);
      const data = await res.json();
      setBlocks(data.slice(-10).reverse());
    } catch (err) {
      console.error('Failed to fetch blocks:', err);
    }
  };

  const formatSupply = (supply: string) => {
    return (parseInt(supply) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Box className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">GYDSchain Explorer</h1>
                <p className="text-sm text-muted-foreground">Hybrid PoW + PoS Private Network</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "default" : "destructive"} className="gap-1">
                <Activity className="h-3 w-3" />
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Block Height</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.blockHeight.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground">120s block time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats ? formatSupply(stats.totalSupply) : '0'} GYDS</div>
              <p className="text-xs text-muted-foreground">Max: 100M GYDS</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Validators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.validators || 0} / 21</div>
              <p className="text-xs text-muted-foreground">Validator slots</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mining Difficulty</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.difficulty.toString(16) || '0'}</div>
              <p className="text-xs text-muted-foreground">Adjusts every 10 blocks</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="blocks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="blocks">Recent Blocks</TabsTrigger>
            <TabsTrigger value="consensus">Consensus Stats</TabsTrigger>
            <TabsTrigger value="node">Node Info</TabsTrigger>
          </TabsList>

          <TabsContent value="blocks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Latest Blocks</CardTitle>
                <CardDescription>Most recent blocks on the chain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <div key={block.index} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <Badge variant={block.type === 'POW' ? 'default' : 'secondary'}>
                          {block.type}
                        </Badge>
                        <div>
                          <p className="font-medium">Block #{block.index}</p>
                          <p className="text-sm text-muted-foreground">
                            {block.type === 'POW' ? 'Mined' : 'Validated'} by {formatAddress(block.miner || block.validator || '')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{(parseInt(block.reward) / 1e18).toFixed(2)} GYDS</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(block.timestamp * 1000).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {blocks.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No blocks yet. Waiting for mining/validation...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consensus" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Proof of Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm:</span>
                    <span className="font-medium">SHA-256</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block Reward:</span>
                    <span className="font-medium">3 GYDS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last PoW Block:</span>
                    <span className="font-medium">#{stats?.lastPOWBlock || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Difficulty:</span>
                    <span className="font-mono text-sm">{stats?.difficulty.toString(16) || '0x0'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Proof of Stake
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Stake:</span>
                    <span className="font-medium">1 GYDS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stake Reward:</span>
                    <span className="font-medium">1 GYDS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last PoS Block:</span>
                    <span className="font-medium">#{stats?.lastPOSBlock || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Validators:</span>
                    <span className="font-medium">{stats?.validators || 0} / 21</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="node" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Node Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain ID:</span>
                  <span className="font-medium">9125</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network ID:</span>
                  <span className="font-medium">9125</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node Address:</span>
                  <span className="font-mono text-sm">{formatAddress(stats?.nodeAddress || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RPC URL:</span>
                  <span className="font-mono text-sm">{nodeUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Type:</span>
                  <Badge variant="outline">Private</Badge>
                </div>
                <Button 
                  className="mt-4 w-full" 
                  onClick={() => window.open(`${nodeUrl}/stats`, '_blank')}
                >
                  View Full Stats (JSON)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

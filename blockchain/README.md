# 🔗 GYDSchain - Private Blockchain Network

A hybrid PoW + PoS Layer-1 blockchain with 120-second blocks, SHA-256 mining, and 21 validator slots.

## 🚀 Quick Start (Private Network)

### Prerequisites
- Docker & Docker Compose
- Go 1.21+ (for local development)

### Deploy 3-Node Private Network

```bash
cd blockchain
docker-compose up -d
```

This starts 3 private nodes:
- Node 1: http://localhost:8545
- Node 2: http://localhost:8546
- Node 3: http://localhost:8547

### Check Node Status

```bash
curl http://localhost:8545/stats
```

### View Blocks

```bash
curl http://localhost:8545/blocks
```

### Stake to Become Validator

```bash
curl -X POST http://localhost:8545/stake \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234...",
    "amount": "1000000000000000000"
  }'
```

## 📊 Chain Specifications

| Parameter | Value |
|-----------|-------|
| Chain ID | 9125 |
| Network ID | 9125 |
| Block Time | 120 seconds |
| Max Supply | 100,000,000 GYDS |
| Initial Supply | 0 (no premine) |
| Decimals | 18 |

### ⛏️ Proof of Work
- Algorithm: SHA-256
- Block Reward: 3 GYDS
- Initial Difficulty: 0x20000
- Adjustment: Every 10 blocks

### 🗳️ Proof of Stake
- Min Stake: 1 GYDS
- Stake Reward: 1 GYDS/block
- Validator Slots: 21
- Lock Duration: 24 hours
- Unlock Duration: 24 hours

## 🔌 RPC Endpoints

### Stats
```bash
GET /stats
```

### Blocks
```bash
GET /blocks
GET /block/:number
```

### Transactions
```bash
GET /transactions
POST /transactions
```

### Validators
```bash
GET /validators
POST /stake
```

### JSON-RPC 2.0
```bash
POST /rpc
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

## 🛠️ Local Development

```bash
cd blockchain/node
go run main.go
```

## 🔒 Security (Private Network)

- No public discovery
- No bootnodes (private only)
- Network isolated by Docker
- Custom chain ID prevents accidental public connection

## 📦 Build Node Binary

```bash
cd blockchain/node
go build -o gydschain-node main.go
./gydschain-node
```

## 🌐 Network Configuration

Edit `docker-compose.yml` to add more nodes or change ports.

## 📝 Genesis Configuration

See `genesis.json` for full chain configuration.

## 🔍 Monitoring

Use the React dashboard at http://localhost:5173 to monitor your private network in real-time.

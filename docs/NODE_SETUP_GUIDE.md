# GYD Network Node Setup Guide

This guide explains how to set up and run Full Nodes and Lite Nodes for the GYD blockchain network on Ubuntu 22.04.

## Node Types

### Full Node
- Stores complete blockchain history
- Validates all transactions and blocks
- Participates in consensus
- Requires more resources (CPU, RAM, Storage)
- Recommended specs: 4GB RAM, 4 CPU cores, 100GB+ SSD

### Lite Node
- Stores recent blockchain data only
- Validates transactions using SPV (Simplified Payment Verification)
- Lower resource requirements
- Recommended specs: 2GB RAM, 2 CPU cores, 20GB SSD

## Prerequisites

### System Requirements
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y docker.io docker-compose git curl
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Setup Instructions

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/gyd-blockchain.git
cd gyd-blockchain/blockchain
```

### Step 2: Configure Node

Create a configuration file for your node:

```bash
# For Full Node
cp node-config.full.example node-config.yml

# For Lite Node
cp node-config.lite.example node-config.yml
```

Edit `node-config.yml`:

```yaml
# Node Configuration
node:
  type: "full"  # or "lite"
  version: "1.0.0"
  
network:
  listen_address: "0.0.0.0"
  port: 8545
  max_peers: 50
  
location:
  region: "us-east"
  country: "US"
  
wallet:
  address: "YOUR_WALLET_ADDRESS"
  public_key: "YOUR_PUBLIC_KEY"
  
sync:
  fast_sync: true
  checkpoint_interval: 1000
  
rpc:
  enabled: true
  port: 8546
  cors_origins: ["*"]
```

### Step 3: Generate Node Credentials

```bash
# Generate node ID and keys
cd blockchain/node
go run main.go generate-keys

# This will output:
# - Node ID
# - Public Key
# - Private Key (store securely!)
# - Wallet Address
```

Save these credentials in a secure location. Update your `node-config.yml` with the wallet address and public key.

### Step 4: Start the Node

#### Using Docker Compose

```bash
# Build the node
docker-compose build

# Start the node
docker-compose up -d

# Check logs
docker-compose logs -f node
```

#### Using Docker Directly

```bash
# Build image
docker build -t gyd-node ./node

# Run Full Node
docker run -d \
  --name gyd-full-node \
  -p 8545:8545 \
  -p 8546:8546 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/node-config.yml:/app/config.yml \
  gyd-node

# Run Lite Node
docker run -d \
  --name gyd-lite-node \
  -p 8545:8545 \
  -v $(pwd)/data-lite:/app/data \
  -v $(pwd)/node-config.yml:/app/config.yml \
  gyd-node --lite
```

#### Manual Setup (without Docker)

```bash
cd blockchain/node

# Install dependencies
go mod download

# Build the node
go build -o gyd-node

# Run Full Node
./gyd-node --config=./node-config.yml

# Run Lite Node
./gyd-node --config=./node-config.yml --lite
```

### Step 5: Register Node with Network

After starting your node, register it with the GYD network:

```bash
# Use the registration API
curl -X POST https://your-app.com/functions/v1/register-node \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "YOUR_NODE_ID",
    "nodeType": "full",
    "ipAddress": "YOUR_PUBLIC_IP",
    "port": 8545,
    "region": "us-east",
    "country": "US",
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "publicKey": "YOUR_PUBLIC_KEY",
    "version": "1.0.0"
  }'
```

### Step 6: Verify Node is Running

```bash
# Check node status
curl http://localhost:8546/status

# Check peer connections
curl http://localhost:8546/peers

# Check sync status
curl http://localhost:8546/sync

# View logs
docker-compose logs -f node
```

## Node Maintenance

### Update Node Software

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Backup Node Data

```bash
# Stop node
docker-compose down

# Backup data directory
tar -czf gyd-node-backup-$(date +%Y%m%d).tar.gz data/

# Restart node
docker-compose up -d
```

### Monitor Node Health

Create a monitoring script `monitor-node.sh`:

```bash
#!/bin/bash

# Check if node is running
if ! docker ps | grep -q gyd-node; then
  echo "Node is not running! Restarting..."
  docker-compose up -d
  exit 1
fi

# Check RPC response
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8546/status)
if [ "$RESPONSE" != "200" ]; then
  echo "Node RPC not responding! Response: $RESPONSE"
  docker-compose restart
  exit 1
fi

# Update last seen
curl -X POST https://your-app.com/functions/v1/node-heartbeat \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "YOUR_NODE_ID"}'

echo "Node health check passed at $(date)"
```

Make it executable and add to crontab:

```bash
chmod +x monitor-node.sh

# Run every 5 minutes
crontab -e
# Add: */5 * * * * /path/to/monitor-node.sh >> /var/log/gyd-node-monitor.log 2>&1
```

## Firewall Configuration

```bash
# Allow node port
sudo ufw allow 8545/tcp
sudo ufw allow 8546/tcp

# Enable firewall
sudo ufw enable
```

## Troubleshooting

### Node Won't Start

```bash
# Check logs
docker-compose logs node

# Verify configuration
cat node-config.yml

# Check port availability
sudo netstat -tlnp | grep 8545
```

### Sync Issues

```bash
# Clear data and resync
docker-compose down
rm -rf data/*
docker-compose up -d

# Check peer connections
curl http://localhost:8546/peers
```

### High Resource Usage

For Full Nodes with limited resources:

```yaml
# In node-config.yml
sync:
  fast_sync: true
  cache_size: 512  # MB
  max_batch_size: 128
```

## Node API Endpoints

### Status Endpoint
```bash
GET http://localhost:8546/status
```

Response:
```json
{
  "nodeId": "node_abc123",
  "version": "1.0.0",
  "type": "full",
  "syncStatus": "synced",
  "blockHeight": 12345,
  "peerCount": 25
}
```

### Peers Endpoint
```bash
GET http://localhost:8546/peers
```

### Transaction Submission
```bash
POST http://localhost:8546/transaction
Content-Type: application/json

{
  "from": "0x...",
  "to": "0x...",
  "amount": "100.00000000",
  "signature": "..."
}
```

## Rewards and Incentives

Nodes earn GYD rewards for:
- Staying online and synchronized
- Validating transactions
- Participating in consensus (Full Nodes only)
- Helping new nodes sync

Check your node rewards:
```bash
curl http://localhost:8546/rewards
```

## Security Best Practices

1. **Protect Private Keys**: Never share or expose your node's private key
2. **Use Firewall**: Only expose necessary ports
3. **Regular Updates**: Keep node software up to date
4. **Monitor Logs**: Watch for suspicious activity
5. **Secure RPC**: If exposing RPC publicly, use authentication
6. **Backup Regularly**: Keep backups of wallet and configuration

## Support

For issues or questions:
- Check logs: `docker-compose logs -f node`
- View network status: https://your-app.com/network-status
- Join community: Discord/Telegram links
- Report issues: GitHub Issues

## Advanced Configuration

### Load Balancing Multiple Nodes

For running multiple nodes on the same server:

```yaml
# node1-config.yml
network:
  port: 8545
rpc:
  port: 8546

# node2-config.yml  
network:
  port: 8645
rpc:
  port: 8646
```

### Custom Genesis Block

For private networks:

```bash
# Generate genesis block
./gyd-node init-genesis --chain-id=1337 --output=genesis.json

# Start with custom genesis
./gyd-node --genesis=./genesis.json
```

## Monitoring Dashboard

Access the node dashboard at: `http://localhost:8546/dashboard`

This provides:
- Real-time sync status
- Transaction throughput
- Peer connections map
- Resource usage graphs
- Recent blocks and transactions

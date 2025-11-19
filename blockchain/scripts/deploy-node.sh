#!/bin/bash

# GYD Node Deployment Script for Ubuntu 22.04
# Usage: ./deploy-node.sh [full|lite]

set -e

NODE_TYPE=${1:-full}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "GYD Node Deployment Script"
echo "Node Type: $NODE_TYPE"
echo "========================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo "Please don't run as root"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
sudo apt update
sudo apt install -y docker.io docker-compose git curl jq

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
if ! groups | grep -q docker; then
  echo "Adding user to docker group..."
  sudo usermod -aG docker $USER
  echo "Please logout and login again for docker group to take effect"
  echo "Then run this script again"
  exit 0
fi

# Check if configuration exists
if [ ! -f "$PROJECT_ROOT/node-config.yml" ]; then
  echo "Creating node configuration..."
  if [ "$NODE_TYPE" = "full" ]; then
    cp "$PROJECT_ROOT/node-config.full.example" "$PROJECT_ROOT/node-config.yml"
  else
    cp "$PROJECT_ROOT/node-config.lite.example" "$PROJECT_ROOT/node-config.yml"
  fi
  
  echo "Configuration file created at: $PROJECT_ROOT/node-config.yml"
  echo "Please edit this file with your wallet details before continuing"
  echo ""
  echo "To generate wallet credentials, run:"
  echo "  cd $PROJECT_ROOT/node && go run main.go generate-keys"
  exit 0
fi

# Verify configuration
echo "Verifying configuration..."
if ! grep -q "YOUR_WALLET_ADDRESS_HERE" "$PROJECT_ROOT/node-config.yml"; then
  echo "Configuration appears to be set up"
else
  echo "ERROR: Please update node-config.yml with your wallet details"
  exit 1
fi

# Create data directory
echo "Creating data directories..."
if [ "$NODE_TYPE" = "full" ]; then
  mkdir -p "$PROJECT_ROOT/data/blocks"
  mkdir -p "$PROJECT_ROOT/data/state"
else
  mkdir -p "$PROJECT_ROOT/data-lite/headers"
fi

mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/keys"

# Build Docker image
echo "Building Docker image..."
cd "$PROJECT_ROOT"
docker-compose build

# Start node
echo "Starting $NODE_TYPE node..."
if [ "$NODE_TYPE" = "full" ]; then
  docker-compose up -d node
else
  docker-compose up -d lite-node
fi

# Wait for node to start
echo "Waiting for node to start..."
sleep 5

# Check if node is running
if docker ps | grep -q "gyd.*node"; then
  echo "Node started successfully!"
  
  # Get node info
  NODE_ID=$(docker-compose logs node 2>/dev/null | grep "Node ID:" | tail -1 | awk '{print $NF}')
  
  echo ""
  echo "========================================="
  echo "Node Deployment Complete!"
  echo "========================================="
  echo "Node Type: $NODE_TYPE"
  echo "Node ID: $NODE_ID"
  echo "RPC Port: 8546"
  echo "P2P Port: 8545"
  echo ""
  echo "Check status: curl http://localhost:8546/status"
  echo "View logs: docker-compose logs -f node"
  echo ""
  echo "Next steps:"
  echo "1. Register your node with the network"
  echo "2. Configure firewall to allow ports 8545 and 8546"
  echo "3. Set up monitoring with the provided scripts"
  echo "========================================="
else
  echo "ERROR: Node failed to start"
  echo "Check logs with: docker-compose logs node"
  exit 1
fi

# Create monitoring script
cat > "$PROJECT_ROOT/scripts/monitor.sh" << 'EOF'
#!/bin/bash
NODE_STATUS=$(curl -s http://localhost:8546/status || echo "ERROR")
echo "$(date): $NODE_STATUS" >> /var/log/gyd-node-status.log

if [[ "$NODE_STATUS" == *"ERROR"* ]]; then
  echo "Node is down, restarting..."
  cd "$(dirname "$0")/.." && docker-compose restart
fi
EOF

chmod +x "$PROJECT_ROOT/scripts/monitor.sh"

echo ""
echo "Monitoring script created at: $PROJECT_ROOT/scripts/monitor.sh"
echo "Add to crontab: */5 * * * * $PROJECT_ROOT/scripts/monitor.sh"

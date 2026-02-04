#!/bin/bash

# Local Development Setup Script
# Run this script to set up your local development environment

set -e

echo "🔧 Setting up Rapid Response Shopper for local development"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }
command -v func >/dev/null 2>&1 || { echo "⚠️ Azure Functions Core Tools not found. Install with: npm install -g azure-functions-core-tools@4"; }

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "⚠️ Node.js 20+ is recommended. Current version: $(node -v)"
fi

echo "✅ Prerequisites checked"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared package first
echo "🔨 Building shared package..."
npm run build -w src/shared

# Create local settings files if they don't exist
echo "📝 Creating local configuration files..."

if [ ! -f "src/api/local.settings.json" ]; then
  cat > src/api/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://localhost:8081",
    "COSMOS_DATABASE_NAME": "rapid-response-shopper",
    "BESTBUY_API_KEY": "",
    "API_KEY": "dev-api-key"
  }
}
EOF
  echo "  Created src/api/local.settings.json"
fi

if [ ! -f "src/workers/local.settings.json" ]; then
  cat > src/workers/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://localhost:8081",
    "COSMOS_DATABASE_NAME": "rapid-response-shopper",
    "SERVICE_BUS_NAMESPACE": "localhost",
    "BESTBUY_API_KEY": "",
    "SMS_PHONE_NUMBER": "",
    "ACS_ENDPOINT": ""
  }
}
EOF
  echo "  Created src/workers/local.settings.json"
fi

if [ ! -f "src/web/.env.local" ]; then
  cat > src/web/.env.local << 'EOF'
VITE_API_BASE_URL=http://localhost:7071/api
VITE_API_KEY=dev-api-key
EOF
  echo "  Created src/web/.env.local"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start Azure Cosmos DB Emulator (or use Azure Cosmos DB)"
echo "   - Windows: Start from Windows Start menu"
echo "   - macOS/Linux: Use Docker: docker run -p 8081:8081 -p 10251-10254:10251-10254 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator"
echo ""
echo "2. Add your Best Buy API key to local.settings.json files"
echo "   - Get an API key from https://developer.bestbuy.com/"
echo ""
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "   Or start individually:"
echo "   - API:     cd src/api && npm run dev"
echo "   - Workers: cd src/workers && npm run dev"  
echo "   - Web:     cd src/web && npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"

#!/bin/bash

# Rapid Response Shopper - Deployment Script
# This script deploys the complete solution to Azure

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-dev}"
LOCATION="${LOCATION:-eastus}"
BASE_NAME="${BASE_NAME:-rrshopper}"

echo "🚀 Deploying Rapid Response Shopper"
echo "   Environment: $ENVIRONMENT"
echo "   Location: $LOCATION"
echo "   Base Name: $BASE_NAME"
echo ""

# Check prerequisites
command -v az >/dev/null 2>&1 || { echo "❌ Azure CLI is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v func >/dev/null 2>&1 || { echo "❌ Azure Functions Core Tools are required but not installed."; exit 1; }

# Check Azure login
az account show >/dev/null 2>&1 || { echo "❌ Please login to Azure first: az login"; exit 1; }

echo "📦 Building packages..."
npm run build --workspaces

echo "🏗️ Deploying infrastructure..."
az deployment sub create \
  --location "$LOCATION" \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --parameters environment="$ENVIRONMENT" \
  --parameters baseName="$BASE_NAME"

# Get outputs
RESOURCE_GROUP="rg-${BASE_NAME}-${ENVIRONMENT}"
FUNCTION_APP_NAME=$(az deployment sub show --name main --query "properties.outputs.functionAppHostname.value" -o tsv | cut -d'.' -f1)

echo "☁️ Deploying API functions..."
cd src/api
func azure functionapp publish "$FUNCTION_APP_NAME" --typescript
cd ../..

echo "☁️ Deploying worker functions..."
cd src/workers
func azure functionapp publish "$FUNCTION_APP_NAME" --typescript
cd ../..

echo "🌐 Deploying web frontend..."
# Get Static Web App deployment token
SWA_NAME="stapp-${BASE_NAME}-${ENVIRONMENT}"
SWA_TOKEN=$(az staticwebapp secrets list --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.apiKey" -o tsv)

cd src/web
npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token "$SWA_TOKEN" --env production
cd ../..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Resources:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Function App: https://${FUNCTION_APP_NAME}.azurewebsites.net"
echo "   Web App: https://$(az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)"
echo ""
echo "⚠️ Remember to:"
echo "   1. Set BESTBUY_API_KEY in Key Vault"
echo "   2. Configure SMS_PHONE_NUMBER in Key Vault"
echo "   3. Provision a phone number in Azure Communication Services"

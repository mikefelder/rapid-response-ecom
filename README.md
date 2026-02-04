# Rapid Response Ecom

A highly performant, extensible Azure-based solution for monitoring high-demand retail product inventory availability. Designed for personal use with sub-second notification latency when products come back in stock.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Azure Static Web App                               │
│                         (React SPA - Product Management UI)                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Azure Functions (API Layer)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Product CRUD   │  │  History Query  │  │  User Prefs     │                  │
│  │  Endpoints      │  │  Endpoints      │  │  Endpoints      │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│     Azure Cosmos DB    │  │    Azure Key Vault     │  │   Azure Service Bus    │
│  ┌──────────────────┐  │  │                        │  │                        │
│  │ Products         │  │  │ • API Keys             │  │ ┌────────────────────┐ │
│  │ InventoryHistory │  │  │ • Connection Strings   │  │ │ inventory-events   │ │
│  │ UserPreferences  │  │  │ • Secrets              │  │ │ notification-queue │ │
│  └──────────────────┘  │  │                        │  │ └────────────────────┘ │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
                                        │                           │
                                        │                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Azure Functions (Background Workers)                      │
│  ┌───────────────────────────────┐  ┌───────────────────────────────────────┐   │
│  │   Inventory Polling Worker    │  │      Notification Delivery Worker     │   │
│  │   (Timer Triggered)           │  │      (Service Bus Triggered)          │   │
│  │   • Best Buy Provider         │  │      • SMS (Twilio/ACS)               │   │
│  │   • [Future: Amazon, Walmart] │  │      • Push Notifications             │   │
│  └───────────────────────────────┘  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                                       │
                    ▼                                       ▼
┌────────────────────────┐                  ┌────────────────────────────────────┐
│   Retailer APIs        │                  │  Azure Communication Services      │
│   • Best Buy           │                  │  (SMS Delivery)                    │
│   • [Future Providers] │                  └────────────────────────────────────┘
└────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Azure Application Insights                            │
│                    (Logging, Metrics, Distributed Tracing)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Sub-second notifications**: End-to-end latency ≤1 second from inventory detection to notification
- **Multi-channel alerts**: SMS and push notifications with direct add-to-cart links
- **Inventory history**: Complete audit trail of stock availability changes
- **Pluggable retailers**: Extensible provider pattern for adding new retailers
- **Cost optimized**: Designed for single-user personal use with minimal Azure spend

## Project Structure

```
rapid-response-ecom/
├── docs/                      # Architecture documentation
├── infra/                     # Bicep infrastructure templates
│   ├── main.bicep            # Main deployment template
│   ├── main.bicepparam       # Environment parameters
│   └── modules/              # Modular Bicep components
├── src/
│   ├── api/                  # Azure Functions - REST API
│   ├── workers/              # Azure Functions - Background workers
│   │   ├── inventory-monitor/
│   │   └── notification-sender/
│   ├── web/                  # React frontend application
│   └── shared/               # Shared TypeScript libraries
│       ├── models/           # Data models
│       ├── providers/        # Retailer provider interfaces
│       └── utils/            # Utility functions
├── tests/                    # Test suites
└── scripts/                  # Deployment and utility scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4
- Azure subscription

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and configure
4. Start the development environment: `npm run dev`

### Deployment

```bash
# Login to Azure
az login

# Deploy infrastructure
az deployment sub create \
  --location eastus \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam

# Deploy application code
npm run deploy
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `BESTBUY_API_KEY` | Best Buy API key for inventory checks |
| `COSMOS_CONNECTION_STRING` | Azure Cosmos DB connection string |
| `SERVICE_BUS_CONNECTION_STRING` | Azure Service Bus connection string |
| `ACS_CONNECTION_STRING` | Azure Communication Services connection |
| `USER_PHONE_NUMBER` | Phone number for SMS notifications |

## Future Roadmap

- [ ] Amazon retailer provider
- [ ] Walmart retailer provider
- [ ] AI-powered restock prediction
- [ ] Automated purchase agent
- [ ] Conversational product management

## License

MIT

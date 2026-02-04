# Architecture Decision Records

## ADR-001: Event-Driven Architecture with Azure Service Bus

### Status
Accepted

### Context
We need to achieve sub-second notification latency when inventory becomes available. The system must handle state transitions reliably and decouple the monitoring service from notification delivery.

### Decision
Use Azure Service Bus as the event backbone:
- **Topics** for inventory state change events (fan-out to multiple consumers)
- **Queues** for notification delivery (guaranteed delivery with retries)

### Consequences
- ✅ Decoupled components enable independent scaling
- ✅ Built-in retry and dead-letter queue support
- ✅ Sub-second message delivery within Azure
- ⚠️ Additional Azure cost (minimal for single-user volume)

---

## ADR-002: Azure Cosmos DB for Data Storage

### Status
Accepted

### Context
We need a database that supports:
- Fast reads/writes for inventory state
- Efficient time-series queries for history
- Low operational overhead for single-user deployment

### Decision
Use Azure Cosmos DB with the NoSQL API:
- **Serverless capacity mode** for cost optimization
- **Partition by product ID** for optimal read performance
- **TTL on history records** (optional) to manage storage costs

### Consequences
- ✅ Millisecond read/write latency
- ✅ Serverless = pay only for what you use
- ✅ Built-in change feed for reactive patterns
- ⚠️ Need to design partition strategy carefully

---

## ADR-003: Pluggable Retailer Provider Pattern

### Status
Accepted

### Context
Initially supporting Best Buy, but the system should easily accommodate additional retailers (Amazon, Walmart, etc.) without architectural changes.

### Decision
Implement a provider pattern with:
- `IInventoryProvider` interface defining the contract
- Provider implementations registered in a factory
- Configuration-driven provider selection per product

```typescript
interface IInventoryProvider {
  retailerId: string;
  checkInventory(productId: string, locations?: string[]): Promise<InventoryStatus>;
  getAddToCartUrl(productId: string): string;
}
```

### Consequences
- ✅ New retailers added without modifying core logic
- ✅ Each provider can handle retailer-specific rate limits
- ✅ Easy to test providers in isolation

---

## ADR-004: Timer-Triggered Polling with Adaptive Intervals

### Status
Accepted

### Context
Best Buy API has rate limits. Products may have different "urgency" levels based on historical restock patterns. We need efficient polling that maximizes detection speed while respecting API limits.

### Decision
- Use Azure Functions Timer Trigger as the polling scheduler
- Implement adaptive polling intervals:
  - **Hot products**: Poll every 5-10 seconds
  - **Normal products**: Poll every 30-60 seconds
- Batch API calls where the retailer API supports it

### Consequences
- ✅ Cost-efficient polling based on priority
- ✅ Respects API rate limits
- ⚠️ Need to monitor and adjust intervals based on API behavior

---

## ADR-005: Azure Communication Services for SMS

### Status
Accepted

### Context
SMS notifications must be delivered with minimal latency and high reliability. Options considered:
- Azure Communication Services (ACS)
- Twilio
- AWS SNS

### Decision
Use Azure Communication Services:
- Native Azure integration
- Competitive pricing for low volumes
- Supports future expansion to other channels

### Consequences
- ✅ Unified Azure billing
- ✅ Easy Key Vault integration for credentials
- ✅ Built-in delivery receipts
- ⚠️ May need Twilio for international numbers (ACS has limited country support)

---

## ADR-006: Single-User Authentication with Azure AD B2C or Static API Key

### Status
Accepted

### Context
This is a personal project for a single user. Full multi-tenant authentication is overkill, but we still need to secure the API.

### Decision
Support two authentication modes:
1. **Simple mode**: Static API key in request headers (development/simple deployment)
2. **Enhanced mode**: Azure AD B2C for OAuth2 flow (optional, for learning/production hardening)

### Consequences
- ✅ Low barrier to entry for personal deployment
- ✅ Path to more robust auth if needed
- ⚠️ API key mode requires careful secret management

---

## ADR-007: React SPA with Azure Static Web Apps

### Status
Accepted

### Context
Need a lightweight, cost-effective web UI for product management that's easy to deploy and maintain.

### Decision
- React 18+ with TypeScript
- Vite for build tooling
- Azure Static Web Apps for hosting (free tier available)
- Direct API calls to Azure Functions backend

### Consequences
- ✅ Free hosting for low-traffic personal use
- ✅ Automatic SSL and CDN
- ✅ Integrated staging environments
- ✅ Modern development experience

---

## ADR-008: Observability with Application Insights

### Status
Accepted

### Context
Need visibility into:
- Inventory check success/failure rates
- Notification delivery status
- API response times and errors
- Cost attribution

### Decision
Use Azure Application Insights:
- Structured logging from all Functions
- Custom metrics for inventory events
- Distributed tracing across components
- Alerts for critical failures

### Consequences
- ✅ Single pane of glass for all telemetry
- ✅ Built-in Azure Functions integration
- ✅ Cost-effective for low volumes
- ✅ Query language for custom analytics

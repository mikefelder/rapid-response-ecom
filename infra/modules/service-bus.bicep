// ==============================================================================
// Service Bus Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Unique suffix for globally unique names')
param uniqueSuffix string

// ==============================================================================
// Resources
// ==============================================================================

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sb${baseName}${environment}${uniqueSuffix}'
  location: location
  tags: tags
  sku: {
    name: 'Basic' // Cost-optimized for personal use (no topics, but queues work)
    tier: 'Basic'
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false // Allow connection string auth for flexibility
  }
}

// Queue for inventory change events
resource inventoryEventsQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'inventory-events'
  properties: {
    maxDeliveryCount: 5
    lockDuration: 'PT1M' // 1 minute lock
    defaultMessageTimeToLive: 'P1D' // 1 day TTL
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false // Not needed for low volume
    maxSizeInMegabytes: 1024
  }
}

// Queue for notification delivery
resource notificationsQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'notifications'
  properties: {
    maxDeliveryCount: 3 // Fewer retries for time-sensitive notifications
    lockDuration: 'PT30S' // 30 second lock
    defaultMessageTimeToLive: 'PT1H' // 1 hour TTL - notifications should be timely
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false
    maxSizeInMegabytes: 1024
  }
}

// Dead letter queue monitoring - using built-in DLQ subqueues

// ==============================================================================
// Outputs
// ==============================================================================

@description('Service Bus namespace name')
output namespaceName string = serviceBusNamespace.name

@description('Service Bus namespace resource ID')
output resourceId string = serviceBusNamespace.id

@description('Service Bus namespace endpoint')
output endpoint string = serviceBusNamespace.properties.serviceBusEndpoint

@description('Inventory events queue name')
output inventoryEventsQueueName string = inventoryEventsQueue.name

@description('Notifications queue name')
output notificationsQueueName string = notificationsQueue.name

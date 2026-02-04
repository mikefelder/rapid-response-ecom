// ==============================================================================
// Cosmos DB Module
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
// Variables
// ==============================================================================

var databaseName = 'rapid-response-shopper'

// Container configurations
var containers = [
  {
    name: 'products'
    partitionKey: '/id'
    indexingPolicy: {
      automatic: true
      indexingMode: 'consistent'
      includedPaths: [
        { path: '/*' }
      ]
      excludedPaths: [
        { path: '/"_etag"/?' }
      ]
      compositeIndexes: [
        [
          { path: '/retailer', order: 'ascending' }
          { path: '/isActive', order: 'ascending' }
          { path: '/lastCheckedAt', order: 'descending' }
        ]
      ]
    }
    defaultTtl: -1 // No TTL - keep products indefinitely
  }
  {
    name: 'inventory-history'
    partitionKey: '/productId'
    indexingPolicy: {
      automatic: true
      indexingMode: 'consistent'
      includedPaths: [
        { path: '/*' }
      ]
      excludedPaths: [
        { path: '/"_etag"/?' }
      ]
      compositeIndexes: [
        [
          { path: '/productId', order: 'ascending' }
          { path: '/timestamp', order: 'descending' }
        ]
      ]
    }
    defaultTtl: 7776000 // 90 days in seconds
  }
  {
    name: 'user-preferences'
    partitionKey: '/id'
    indexingPolicy: {
      automatic: true
      indexingMode: 'consistent'
      includedPaths: [
        { path: '/*' }
      ]
      excludedPaths: [
        { path: '/"_etag"/?' }
      ]
    }
    defaultTtl: -1 // No TTL
  }
]

// ==============================================================================
// Resources
// ==============================================================================

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos${baseName}${environment}${uniqueSuffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    // Serverless for cost optimization in single-user scenario
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location // Using deployment region
        failoverPriority: 0
        isZoneRedundant: false // Cost optimization for personal use
      }
    ]
    // Security settings
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false // Enable for RBAC + connection string flexibility
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [
  for container in containers: {
    parent: database
    name: container.name
    properties: {
      resource: {
        id: container.name
        partitionKey: {
          paths: [container.partitionKey]
          kind: 'Hash'
          version: 2
        }
        indexingPolicy: container.indexingPolicy
        defaultTtl: container.defaultTtl
      }
    }
  }
]

// ==============================================================================
// Outputs
// ==============================================================================

@description('Cosmos DB account endpoint')
output endpoint string = cosmosAccount.properties.documentEndpoint

@description('Cosmos DB account name')
output accountName string = cosmosAccount.name

@description('Cosmos DB database name')
output databaseName string = databaseName

@description('Cosmos DB resource ID')
output resourceId string = cosmosAccount.id

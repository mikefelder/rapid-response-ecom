// ==============================================================================
// Main Bicep Template - Rapid Response Shopper
// ==============================================================================
// This template deploys all Azure resources for the inventory monitoring system.
// Designed for single-user personal use with cost optimization.
// ==============================================================================

targetScope = 'subscription'

// ==============================================================================
// Parameters
// ==============================================================================

@description('Environment name (e.g., dev, prod)')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Azure region for resource deployment')
param location string = 'southcentralus'

@description('Base name for all resources')
@minLength(3)
@maxLength(16)
param baseName string = 'rrshopper'

@description('Phone number for SMS notifications in E.164 format')
@secure()
param smsPhoneNumber string = ''

@description('Best Buy API key for inventory checks')
@secure()
param bestBuyApiKey string = ''

@description('Tags to apply to all resources')
param tags object = {
  project: 'rapid-response-shopper'
  environment: environment
  managedBy: 'bicep'
}

// ==============================================================================
// Variables
// ==============================================================================

var resourceGroupName = 'rg-${baseName}-${environment}'
var uniqueSuffix = uniqueString(subscription().subscriptionId, baseName, environment)

// ==============================================================================
// Resource Group
// ==============================================================================

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// ==============================================================================
// Modules
// ==============================================================================

// Log Analytics Workspace (required for Application Insights)
module logAnalytics 'modules/log-analytics.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
  }
}

// Application Insights for observability
module appInsights 'modules/app-insights.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
    tags: tags
  }
}

// Key Vault for secrets management
module keyVault 'modules/key-vault.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    secrets: [
      {
        name: 'BestBuyApiKey'
        value: bestBuyApiKey
      }
      {
        name: 'SmsPhoneNumber'
        value: smsPhoneNumber
      }
    ]
  }
}

// Cosmos DB for data storage
module cosmosDb 'modules/cosmos-db.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
  }
}

// Service Bus for event-driven messaging
module serviceBus 'modules/service-bus.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
  }
}

// Azure Communication Services for SMS
module communicationServices 'modules/communication-services.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: 'global' // ACS is a global service
    tags: tags
    uniqueSuffix: uniqueSuffix
  }
}

// Storage Account for Functions
module storageAccount 'modules/storage-account.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    uniqueSuffix: uniqueSuffix
    tags: tags
  }
}

// Azure Functions for API and Workers
module functionApp 'modules/function-app.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    storageAccountName: storageAccount.outputs.storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    appInsightsInstrumentationKey: appInsights.outputs.instrumentationKey
    keyVaultName: keyVault.outputs.keyVaultName
    cosmosDbEndpoint: cosmosDb.outputs.endpoint
    cosmosDbDatabaseName: cosmosDb.outputs.databaseName
    serviceBusNamespace: serviceBus.outputs.namespaceName
    communicationServicesEndpoint: communicationServices.outputs.endpoint
  }
}

// Static Web App for frontend
module staticWebApp 'modules/static-web-app.bicep' = {
  scope: resourceGroup
  params: {
    baseName: baseName
    environment: environment
    location: location
    tags: tags
    uniqueSuffix: uniqueSuffix
    functionAppHostname: functionApp.outputs.defaultHostname
  }
}

// Role assignments for managed identity access
module roleAssignments 'modules/role-assignments.bicep' = {
  scope: resourceGroup
  params: {
    functionAppPrincipalId: functionApp.outputs.principalId
    keyVaultName: keyVault.outputs.keyVaultName
    cosmosDbAccountName: cosmosDb.outputs.accountName
    serviceBusNamespaceName: serviceBus.outputs.namespaceName
    communicationServicesName: communicationServices.outputs.name
    storageAccountName: storageAccount.outputs.storageAccountName
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Resource group name')
output resourceGroupName string = resourceGroup.name

@description('Function App hostname')
output functionAppHostname string = functionApp.outputs.defaultHostname

@description('Static Web App hostname')
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname

@description('Key Vault name')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('Cosmos DB endpoint')
output cosmosDbEndpoint string = cosmosDb.outputs.endpoint

@description('Application Insights connection string')
output appInsightsConnectionString string = appInsights.outputs.connectionString

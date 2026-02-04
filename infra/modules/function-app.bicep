// ==============================================================================
// Azure Functions Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Storage account name for Functions')
param storageAccountName string

@description('File service dependency check')
param storageFileServiceReady string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Application Insights instrumentation key')
param appInsightsInstrumentationKey string

@description('Key Vault name')
param keyVaultName string

@description('Cosmos DB endpoint')
param cosmosDbEndpoint string

@description('Cosmos DB database name')
param cosmosDbDatabaseName string

@description('Service Bus namespace name')
param serviceBusNamespace string

@description('Communication Services endpoint')
param communicationServicesEndpoint string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

// ==============================================================================
// Variables
// ==============================================================================

var functionAppName = 'func${baseName}${environment}${uniqueSuffix}'
var appServicePlanName = 'asp-${baseName}-${environment}'

// ==============================================================================
// Resources
// ==============================================================================

// Reference existing storage account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// Note: Key Vault name is used in app settings for Key Vault references
// No need for existing resource reference here

// App Service Plan - Consumption for cost optimization
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
  }
  properties: {
    reserved: true // Linux
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  tags: union(tags, {
    'azd-service-name': 'api'
  })
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      linuxFxVersion: 'Node|20'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          'http://localhost:3000' // Local development
          'http://localhost:5173' // Vite dev server
        ]
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        // WEBSITE_CONTENTAZUREFILECONNECTIONSTRING and WEBSITE_CONTENTSHARE removed
        // Azure will automatically create and manage the file share for Consumption plan
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsightsInstrumentationKey
        }
        // Key Vault references for secrets
        {
          name: 'BESTBUY_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=BestBuyApiKey)'
        }
        {
          name: 'SMS_PHONE_NUMBER'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=SmsPhoneNumber)'
        }
        // Cosmos DB configuration
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosDbEndpoint
        }
        {
          name: 'COSMOS_DATABASE_NAME'
          value: cosmosDbDatabaseName
        }
        // Service Bus configuration
        {
          name: 'SERVICE_BUS_NAMESPACE'
          value: '${serviceBusNamespace}.servicebus.windows.net'
        }
        // Communication Services configuration
        {
          name: 'ACS_ENDPOINT'
          value: 'https://${communicationServicesEndpoint}'
        }
        // Environment
        {
          name: 'ENVIRONMENT'
          value: environment
        }
      ]
    }
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Function App name')
output name string = functionApp.name

@description('Function App resource ID')
output resourceId string = functionApp.id

@description('Function App default hostname')
output defaultHostname string = functionApp.properties.defaultHostName

@description('Function App managed identity principal ID')
output principalId string = functionApp.identity.principalId

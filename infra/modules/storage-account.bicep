// ==============================================================================
// Storage Account Module
// ==============================================================================

// Parameters baseName and environment kept for module interface consistency
// across all resource modules, even if not used in storage account naming

@description('Base name for resources')
#disable-next-line no-unused-params
param baseName string

@description('Environment name')
#disable-next-line no-unused-params
param environment string

@description('Azure region')
param location string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

@description('Resource tags')
param tags object

// ==============================================================================
// Variables
// ==============================================================================

// Storage account names must be 3-24 characters, lowercase, alphanumeric only
// Format: strrs + uniqueSuffix(13) = 18 chars (safe minimum)
// Using fixed prefix to ensure minimum length
#disable-next-line BCP334
var storageAccountName = toLower('strrs${take(uniqueSuffix, 13)}')

// ==============================================================================
// Resources
// ==============================================================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS' // Cost-optimized for personal use
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true // Required for Azure Functions
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
      virtualNetworkRules: []
      ipRules: []
    }
  }
}

// Blob service for function app
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: false // Cost optimization
    }
  }
}

// Queue service for function triggers
resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// File service for Azure Functions (required for Consumption plan)
resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Storage account name')
output storageAccountName string = storageAccount.name

@description('Storage account resource ID')
output resourceId string = storageAccount.id

@description('Storage account primary endpoint')
output primaryEndpoints object = storageAccount.properties.primaryEndpoints

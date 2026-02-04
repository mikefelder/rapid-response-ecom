// ==============================================================================
// Role Assignments Module
// ==============================================================================
// Assigns necessary RBAC roles to the Function App managed identity
// ==============================================================================

@description('Function App managed identity principal ID')
param functionAppPrincipalId string

@description('Key Vault name')
param keyVaultName string

@description('Cosmos DB account name')
param cosmosDbAccountName string

@description('Service Bus namespace name')
param serviceBusNamespaceName string

// Communication Services name kept for future role assignment needs
@description('Communication Services name')
#disable-next-line no-unused-params
param communicationServicesName string

@description('Storage account name')
param storageAccountName string

// ==============================================================================
// Role Definition IDs
// ==============================================================================

// Built-in role definition IDs
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var cosmosDbDataContributorRoleId = '00000000-0000-0000-0000-000000000002' // Cosmos DB built-in
var serviceBusDataOwnerRoleId = '090c5cfd-751d-490a-894a-3ce6f1109419'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

// ==============================================================================
// Resources - Existing
// ==============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' existing = {
  name: cosmosDbAccountName
}

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' existing = {
  name: serviceBusNamespaceName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// ==============================================================================
// Role Assignments
// ==============================================================================

// Key Vault Secrets User - allows reading secrets
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionAppPrincipalId, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Service Bus Data Owner - allows sending and receiving messages
resource serviceBusDataOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(serviceBusNamespace.id, functionAppPrincipalId, serviceBusDataOwnerRoleId)
  scope: serviceBusNamespace
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', serviceBusDataOwnerRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor - for function app operations
resource storageBlobDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionAppPrincipalId, storageBlobDataContributorRoleId)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Note: Cosmos DB role assignment is done differently using SQL role definitions
// This is handled via the Cosmos DB data plane, not ARM

// ==============================================================================
// Cosmos DB SQL Role Assignment
// ==============================================================================

// Cosmos DB Data Contributor role
resource cosmosDbSqlRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosDbAccount
  name: guid(cosmosDbAccount.id, functionAppPrincipalId, cosmosDbDataContributorRoleId)
  properties: {
    roleDefinitionId: '${cosmosDbAccount.id}/sqlRoleDefinitions/${cosmosDbDataContributorRoleId}'
    principalId: functionAppPrincipalId
    scope: cosmosDbAccount.id
  }
}

// ==============================================================================
// Key Vault Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Secrets to store in Key Vault')
param secrets SecretConfig[]

// ==============================================================================
// Types
// ==============================================================================

@description('Secret configuration')
@sealed()
type SecretConfig = {
  @description('Secret name')
  name: string
  @description('Secret value')
  value: string
}

// ==============================================================================
// Resources
// ==============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${baseName}-${environment}'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true // Use RBAC instead of access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 7 // Minimum for cost optimization
    // Note: enablePurgeProtection not set - once enabled it cannot be disabled
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Store secrets
resource secretResources 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = [
  for secret in secrets: if (!empty(secret.value)) {
    parent: keyVault
    name: secret.name
    properties: {
      value: secret.value
      attributes: {
        enabled: true
      }
    }
  }
]

// ==============================================================================
// Outputs
// ==============================================================================

@description('Key Vault resource ID')
output resourceId string = keyVault.id

@description('Key Vault name')
output keyVaultName string = keyVault.name

@description('Key Vault URI')
output vaultUri string = keyVault.properties.vaultUri

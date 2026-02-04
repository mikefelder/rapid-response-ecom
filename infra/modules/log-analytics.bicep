// ==============================================================================
// Log Analytics Workspace Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

// ==============================================================================
// Resources
// ==============================================================================

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${baseName}-${environment}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30 // Cost-optimized for personal use
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: 1 // Limit daily ingestion for cost control
    }
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Log Analytics Workspace resource ID')
output workspaceId string = logAnalyticsWorkspace.id

@description('Log Analytics Workspace name')
output workspaceName string = logAnalyticsWorkspace.name

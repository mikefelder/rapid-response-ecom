// ==============================================================================
// Application Insights Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Log Analytics Workspace resource ID')
param logAnalyticsWorkspaceId string

@description('Resource tags')
param tags object

// ==============================================================================
// Resources
// ==============================================================================

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${baseName}-${environment}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: 30 // Cost-optimized for personal use
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Application Insights connection string')
output connectionString string = appInsights.properties.ConnectionString

@description('Application Insights instrumentation key')
output instrumentationKey string = appInsights.properties.InstrumentationKey

@description('Application Insights resource ID')
output resourceId string = appInsights.id

@description('Application Insights name')
output name string = appInsights.name

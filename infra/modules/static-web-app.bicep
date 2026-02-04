// ==============================================================================
// Static Web App Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Function App hostname for API backend')
param functionAppHostname string

@description('Unique suffix for globally unique names')
param uniqueSuffix string

// ==============================================================================
// Resources
// ==============================================================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'stapp${baseName}${environment}${uniqueSuffix}'
  location: location
  tags: union(tags, {
    'azd-service-name': 'web'
  })
  sku: {
    name: 'Free' // Cost-optimized for personal use
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      appLocation: '/src/web'
      apiLocation: ''
      outputLocation: 'dist'
      appBuildCommand: 'npm run build'
    }
  }
}

// Link to Function App backend
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: resourceId('Microsoft.Web/sites', 'func-${baseName}-${environment}')
    region: location
  }
}

// App settings for the static web app
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    API_BASE_URL: 'https://${functionAppHostname}/api'
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Static Web App name')
output name string = staticWebApp.name

@description('Static Web App resource ID')
output resourceId string = staticWebApp.id

@description('Static Web App default hostname')
output defaultHostname string = staticWebApp.properties.defaultHostname

// Note: Deployment token should be retrieved via CLI or portal, not output
// Use: az staticwebapp secrets list --name <name> --resource-group <rg>

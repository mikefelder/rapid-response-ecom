// ==============================================================================
// Parameters file for Rapid Response Shopper deployment
// ==============================================================================

using './main.bicep'

// Environment configuration
param environment = 'dev'
param location = 'eastus'
param baseName = 'rrshopper'

// Secrets - these should be passed via secure parameters or CI/CD variables
// Do NOT commit actual secret values to source control
param bestBuyApiKey = '' // Set via: az deployment sub create --parameters bestBuyApiKey='your-key'
param smsPhoneNumber = '' // Set via: az deployment sub create --parameters smsPhoneNumber='+1234567890'

// Resource tags
param tags = {
  project: 'rapid-response-shopper'
  environment: 'dev'
  managedBy: 'bicep'
  owner: 'personal'
}

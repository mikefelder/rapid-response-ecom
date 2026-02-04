// ==============================================================================
// Azure Communication Services Module
// ==============================================================================

@description('Base name for resources')
param baseName string

@description('Environment name')
param environment string

@description('Azure region - ACS is a global service')
param location string

@description('Resource tags')
param tags object

@description('Unique suffix for globally unique names')
param uniqueSuffix string

// ==============================================================================
// Resources
// ==============================================================================

resource communicationServices 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'acs${baseName}${environment}${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    dataLocation: 'United States' // Data residency
  }
}

// Note: Phone number provisioning must be done manually in the Azure Portal
// or via CLI after deployment. This is because phone number availability
// varies by region and requires manual selection.

// ==============================================================================
// Outputs
// ==============================================================================

@description('Communication Services name')
output name string = communicationServices.name

@description('Communication Services resource ID')
output resourceId string = communicationServices.id

@description('Communication Services endpoint')
output endpoint string = communicationServices.properties.hostName

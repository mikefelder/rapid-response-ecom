import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type {
  UserPreferences,
  UserPreferencesResponse,
  UpdateSmsPreferencesRequest,
} from '@rapid-response-shopper/shared';
import { getCosmosClient } from '../services/cosmos-client.js';
import { withAuth } from '../middleware/auth.js';

/**
 * GET /api/preferences
 * Get user preferences
 */
async function getPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const client = await getCosmosClient();
    let preferences = await client.getUserPreferences();

    // Create defaults if not found
    if (!preferences) {
      const now = new Date().toISOString();
      preferences = {
        id: 'default',
        notifications: {
          sms: { enabled: false },
          push: { enabled: false, subscriptions: [] },
        },
        monitoring: {
          defaultPollIntervalSeconds: 30,
          highPriorityPollIntervalSeconds: 10,
        },
        apiKeyReferences: {},
        createdAt: now,
        updatedAt: now,
      };
      await client.createUserPreferences(preferences);
    }

    return { jsonBody: toPreferencesResponse(preferences) };
  } catch (error) {
    context.error(`Error getting preferences: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to get preferences' } },
    };
  }
}

/**
 * PUT /api/preferences/notifications/sms
 * Update SMS notification preferences
 */
async function updateSmsPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as UpdateSmsPreferencesRequest;
    const client = await getCosmosClient();
    let preferences = await client.getUserPreferences();

    if (!preferences) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Preferences not found' } },
      };
    }

    // Validate phone number format if provided
    if (body.phoneNumber && !isValidE164(body.phoneNumber)) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Phone number must be in E.164 format (e.g., +12025551234)' } },
      };
    }

    preferences.notifications.sms = {
      enabled: body.enabled,
      phoneNumber: body.phoneNumber,
    };
    preferences.updatedAt = new Date().toISOString();

    await client.updateUserPreferences(preferences);

    return { jsonBody: toPreferencesResponse(preferences) };
  } catch (error) {
    context.error(`Error updating SMS preferences: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } },
    };
  }
}

/**
 * PUT /api/preferences/notifications/push
 * Update push notification preferences
 */
async function updatePushPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as { enabled: boolean };
    const client = await getCosmosClient();
    let preferences = await client.getUserPreferences();

    if (!preferences) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Preferences not found' } },
      };
    }

    preferences.notifications.push.enabled = body.enabled;
    preferences.updatedAt = new Date().toISOString();

    await client.updateUserPreferences(preferences);

    return { jsonBody: toPreferencesResponse(preferences) };
  } catch (error) {
    context.error(`Error updating push preferences: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } },
    };
  }
}

/**
 * POST /api/preferences/notifications/push/subscriptions
 * Add a push notification subscription
 */
async function addPushSubscription(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as { endpoint: string; keys: { p256dh: string; auth: string } };
    
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return {
        status: 400,
        jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Invalid push subscription' } },
      };
    }

    const client = await getCosmosClient();
    let preferences = await client.getUserPreferences();

    if (!preferences) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Preferences not found' } },
      };
    }

    // Check if subscription already exists
    const exists = preferences.notifications.push.subscriptions.some(
      (s) => s.endpoint === body.endpoint
    );

    if (!exists) {
      preferences.notifications.push.subscriptions.push({
        endpoint: body.endpoint,
        keys: body.keys,
      });
      preferences.updatedAt = new Date().toISOString();
      await client.updateUserPreferences(preferences);
    }

    return {
      status: 201,
      jsonBody: { message: 'Subscription added' },
    };
  } catch (error) {
    context.error(`Error adding push subscription: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to add subscription' } },
    };
  }
}

/**
 * PUT /api/preferences/monitoring
 * Update monitoring preferences
 */
async function updateMonitoringPreferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as {
      defaultPollIntervalSeconds?: number;
      highPriorityPollIntervalSeconds?: number;
    };

    const client = await getCosmosClient();
    let preferences = await client.getUserPreferences();

    if (!preferences) {
      return {
        status: 404,
        jsonBody: { error: { code: 'NOT_FOUND', message: 'Preferences not found' } },
      };
    }

    // Validate intervals (minimum 5 seconds)
    if (body.defaultPollIntervalSeconds !== undefined) {
      if (body.defaultPollIntervalSeconds < 5) {
        return {
          status: 400,
          jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Poll interval must be at least 5 seconds' } },
        };
      }
      preferences.monitoring.defaultPollIntervalSeconds = body.defaultPollIntervalSeconds;
    }

    if (body.highPriorityPollIntervalSeconds !== undefined) {
      if (body.highPriorityPollIntervalSeconds < 5) {
        return {
          status: 400,
          jsonBody: { error: { code: 'VALIDATION_ERROR', message: 'Poll interval must be at least 5 seconds' } },
        };
      }
      preferences.monitoring.highPriorityPollIntervalSeconds = body.highPriorityPollIntervalSeconds;
    }

    preferences.updatedAt = new Date().toISOString();
    await client.updateUserPreferences(preferences);

    return { jsonBody: toPreferencesResponse(preferences) };
  } catch (error) {
    context.error(`Error updating monitoring preferences: ${error}`);
    return {
      status: 500,
      jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } },
    };
  }
}

// Helper functions
function toPreferencesResponse(preferences: UserPreferences): UserPreferencesResponse {
  return {
    notifications: {
      sms: {
        enabled: preferences.notifications.sms.enabled,
        phoneNumber: preferences.notifications.sms.phoneNumber
          ? maskPhoneNumber(preferences.notifications.sms.phoneNumber)
          : undefined,
      },
      push: {
        enabled: preferences.notifications.push.enabled,
        subscriptionCount: preferences.notifications.push.subscriptions.length,
      },
    },
    monitoring: preferences.monitoring,
  };
}

function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.substring(0, 4) + '*'.repeat(phone.length - 4);
}

function isValidE164(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

// Register HTTP endpoints
app.http('getPreferences', {
  methods: ['GET'],
  route: 'preferences',
  authLevel: 'anonymous',
  handler: withAuth(getPreferences),
});

app.http('updateSmsPreferences', {
  methods: ['PUT'],
  route: 'preferences/notifications/sms',
  authLevel: 'anonymous',
  handler: withAuth(updateSmsPreferences),
});

app.http('updatePushPreferences', {
  methods: ['PUT'],
  route: 'preferences/notifications/push',
  authLevel: 'anonymous',
  handler: withAuth(updatePushPreferences),
});

app.http('addPushSubscription', {
  methods: ['POST'],
  route: 'preferences/notifications/push/subscriptions',
  authLevel: 'anonymous',
  handler: withAuth(addPushSubscription),
});

app.http('updateMonitoringPreferences', {
  methods: ['PUT'],
  route: 'preferences/monitoring',
  authLevel: 'anonymous',
  handler: withAuth(updateMonitoringPreferences),
});

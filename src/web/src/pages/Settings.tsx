import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: api.getPreferences,
  });

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  // Update state when preferences load
  useState(() => {
    if (preferences) {
      setSmsEnabled(preferences.notifications.sms.enabled);
      setPhoneNumber(preferences.notifications.sms.phoneNumber ?? '');
      setPushEnabled(preferences.notifications.push.enabled);
    }
  });

  const smsMutation = useMutation({
    mutationFn: api.updateSmsPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const pushMutation = useMutation({
    mutationFn: api.updatePushPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  const handleSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    smsMutation.mutate({
      enabled: smsEnabled,
      phoneNumber: smsEnabled ? phoneNumber : undefined,
    });
  };

  const handlePushToggle = () => {
    const newEnabled = !pushEnabled;
    setPushEnabled(newEnabled);
    pushMutation.mutate({ enabled: newEnabled });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your notification and monitoring preferences</p>
      </div>

      {/* SMS Notifications */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">SMS Notifications</h2>
            <p className="text-gray-500 text-sm mt-1">
              Receive text messages when products come in stock
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {smsEnabled && (
          <form onSubmit={handleSmsSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="input"
                pattern="^\+[1-9]\d{1,14}$"
                title="Phone number must be in E.164 format (e.g., +12025551234)"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter your phone number in E.164 format (e.g., +12025551234)
              </p>
            </div>

            {smsMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">
                  {(smsMutation.error as Error).message}
                </p>
              </div>
            )}

            {smsMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm">SMS preferences saved successfully!</p>
              </div>
            )}

            <button
              type="submit"
              disabled={smsMutation.isPending}
              className="btn btn-primary"
            >
              {smsMutation.isPending ? 'Saving...' : 'Save SMS Settings'}
            </button>
          </form>
        )}

        {preferences?.notifications.sms.phoneNumber && (
          <div className="mt-4 pt-4 border-t text-sm text-gray-500">
            Currently registered: {preferences.notifications.sms.phoneNumber}
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
            <p className="text-gray-500 text-sm mt-1">
              Receive browser push notifications when products come in stock
            </p>
            {preferences?.notifications?.push?.subscriptionCount && preferences.notifications.push.subscriptionCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {preferences.notifications.push.subscriptionCount} device(s) registered
              </p>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={handlePushToggle}
              className="sr-only peer"
              disabled={pushMutation.isPending}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {pushEnabled && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Push notifications are enabled. You'll receive alerts on this device when products come in stock.
            </p>
          </div>
        )}
      </div>

      {/* Monitoring Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monitoring Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Normal Priority Interval</span>
              <p className="text-sm text-gray-500">How often to check normal priority products</p>
            </div>
            <span className="text-gray-900">
              {preferences?.monitoring.defaultPollIntervalSeconds ?? 30} seconds
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">High Priority Interval</span>
              <p className="text-sm text-gray-500">How often to check high priority products</p>
            </div>
            <span className="text-gray-900">
              {preferences?.monitoring.highPriorityPollIntervalSeconds ?? 10} seconds
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          These intervals are configured at the system level. Contact the administrator to change them.
        </p>
      </div>

      {/* API Key Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h2>
        <p className="text-sm text-gray-500">
          API keys and credentials are managed securely through Azure Key Vault. 
          To update API keys, use the Azure Portal or deployment scripts.
        </p>
      </div>
    </div>
  );
}

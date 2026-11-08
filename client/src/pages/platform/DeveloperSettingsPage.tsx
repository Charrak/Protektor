import { useState, useEffect } from 'react';
import { platformService } from '../../services/platform.service';

type Tab = 'general' | 'email' | 'payment' | 'bank' | 'api' | 'security' | 'notifications' | 'backup';

export function DeveloperSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [bankConnections, setBankConnections] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    loadApiKeys();
    loadBankConnections();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await platformService.apiCall('/platform/developer/settings');
      setSettings(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Einstellungen konnten nicht geladen werden' });
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await platformService.apiCall('/platform/developer/api-keys');
      setApiKeys(response.data);
    } catch (error) {
      console.error('API Keys Fehler:', error);
    }
  };

  const loadBankConnections = async () => {
    try {
      const response = await platformService.apiCall('/platform/developer/bank-connections');
      setBankConnections(response.data);
    } catch (error) {
      console.error('Bank Verbindungen Fehler:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await platformService.apiCall('/platform/developer/settings', {
        method: 'PUT',
        data: settings,
      });
      setSettings(response.data);
      setMessage({ type: 'success', text: 'Einstellungen gespeichert' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: string) => {
    try {
      const response = await platformService.apiCall('/platform/developer/test-connection', {
        method: 'POST',
        data: { type },
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: `✅ ${response.data.message}` });
      } else {
        setMessage({ type: 'error', text: `❌ ${response.data.message}` });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Verbindungstest fehlgeschlagen' });
    }
  };

  const createApiKey = async (type: string) => {
    const name = prompt('Name für den API-Key:');
    if (!name) return;
    try {
      await platformService.apiCall('/platform/developer/api-keys', {
        method: 'POST',
        data: { name, type },
      });
      loadApiKeys();
      setMessage({ type: 'success', text: 'API-Key erstellt' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'API-Key konnte nicht erstellt werden' });
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('API-Key wirklich löschen?')) return;
    try {
      await platformService.apiCall(`/platform/developer/api-keys/${id}`, { method: 'DELETE' });
      loadApiKeys();
    } catch (error) {
      setMessage({ type: 'error', text: 'API-Key konnte nicht gelöscht werden' });
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'Allgemein', icon: '🏠' },
    { id: 'email', label: 'E-Mail', icon: '📧' },
    { id: 'payment', label: 'Zahlungen', icon: '💳' },
    { id: 'bank', label: 'Bank/SEPA', icon: '🏦' },
    { id: 'api', label: 'API-Keys', icon: '🔑' },
    { id: 'security', label: 'Sicherheit', icon: '🔒' },
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔' },
    { id: 'backup', label: 'Backup', icon: '💾' },
  ];

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Einstellungen laden...</div>;
  }

  if (!settings) {
    return <div className="text-center py-12 text-red-500">Fehler beim Laden der Einstellungen</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Entwickler-Einstellungen</h1>
        <p className="text-gray-600 mt-2">Zentrale Konfiguration aller Systemeinstellungen</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-8">
        {/* Tab Navigation */}
        <div className="w-56 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Allgemeine Einstellungen</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Systemname</label>
                <input
                  type="text"
                  value={settings.systemName || ''}
                  onChange={e => setSettings({ ...settings, systemName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                <input type="text" value={settings.systemVersion || ''} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50" />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode || false}
                  onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Wartungsmodus aktivieren</label>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">E-Mail Konfiguration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                  <input type="text" value={settings.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                  <input type="number" value={settings.smtpPort || ''} onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" placeholder="587" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP User</label>
                  <input type="text" value={settings.smtpUser || ''} onChange={e => setSettings({ ...settings, smtpUser: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Passwort</label>
                  <input type="password" value={settings.smtpPass || ''} onChange={e => setSettings({ ...settings, smtpPass: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail</label>
                  <input type="email" value={settings.fromEmail || ''} onChange={e => setSettings({ ...settings, fromEmail: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Absender Name</label>
                  <input type="text" value={settings.fromName || ''} onChange={e => setSettings({ ...settings, fromName: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <button onClick={() => testConnection('email')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📧 E-Mail Verbindung testen
              </button>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Stripe Zahlungskonfiguration</h2>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={settings.stripeTestMode || false}
                  onChange={e => setSettings({ ...settings, stripeTestMode: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Testmodus (keine echten Zahlungen)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                <input type="text" value={settings.stripePublicKey || ''} onChange={e => setSettings({ ...settings, stripePublicKey: e.target.value })} className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="pk_test_..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <input type="password" value={settings.stripeSecretKey || ''} onChange={e => setSettings({ ...settings, stripeSecretKey: e.target.value })} className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="sk_test_..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                <input type="password" value={settings.stripeWebhookSecret || ''} onChange={e => setSettings({ ...settings, stripeWebhookSecret: e.target.value })} className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="whsec_..." />
              </div>
              <button onClick={() => testConnection('stripe')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                💳 Stripe Verbindung testen
              </button>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Bank-Verbindung & SEPA-Lastschrift</h2>
              
              {/* Bestehende Verbindungen */}
              {bankConnections.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Konfigurierte Bankverbindungen</h3>
                  <div className="space-y-3">
                    {bankConnections.map(conn => (
                      <div key={conn.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{conn.name}</p>
                          <p className="text-sm text-gray-500">IBAN: {conn.iban} | {conn.bankName}</p>
                        </div>
                        <button onClick={() => {/* delete */}} className="text-red-600 hover:text-red-700">Löschen</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium mb-3">Neue Bankverbindung hinzufügen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Hauptgeschäftskonto" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bankname</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Deutsche Bank" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="DE89 3704 0044 0532 0130 00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">BIC</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="COBADEFFXXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gläubiger-ID</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="DE98ZZZ09999999999" />
                  </div>
                </div>
                <button onClick={() => testConnection('bank')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  🏦 Bankverbindung hinzufügen
                </button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-3">SEPA-Lastschriften</h3>
                <p className="text-sm text-gray-600 mb-4">Automatische Einziehung der Abonnement-Gebühren per SEPA-Lastschrift.</p>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    📋 Sammellastschrift ausführen
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    📊 Mandate verwalten
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">API-Keys Verwaltung</h2>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Bestehende API-Keys</h3>
                {apiKeys.length === 0 ? (
                  <p className="text-gray-500">Keine API-Keys vorhanden</p>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-sm text-gray-500">Typ: {key.type} | Key: {key.key}</p>
                          <p className="text-xs text-gray-400">Erstellt: {new Date(key.createdAt).toLocaleDateString('de-DE')}</p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {key.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                          <button onClick={() => deleteApiKey(key.id)} className="text-red-600 hover:text-red-700">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-3">Neuen API-Key erstellen</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => createApiKey('datev')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    📊 DATEV API-Key
                  </button>
                  <button onClick={() => createApiKey('sms')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    📱 SMS API-Key
                  </button>
                  <button onClick={() => createApiKey('push')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    🔔 Push API-Key
                  </button>
                  <button onClick={() => createApiKey('maps')} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    🗺️ Maps API-Key
                  </button>
                  <button onClick={() => createApiKey('webhook')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    🔗 Webhook API-Key
                  </button>
                </div>
              </div>

              <button onClick={() => testConnection('api')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                🔗 Alle API-Verbindungen testen
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Sicherheitseinstellungen</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max. Login-Versuche</label>
                  <input type="number" value={settings.maxLoginAttempts || 5} onChange={e => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sperrdauer (Minuten)</label>
                  <input type="number" value={settings.lockoutDuration || 15} onChange={e => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min. Passwortlänge</label>
                  <input type="number" value={settings.passwordMinLength || 8} onChange={e => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked={settings.require2FA || false} onChange={e => setSettings({ ...settings, require2FA: e.target.checked })} className="h-4 w-4 text-blue-600 rounded" />
                <label className="ml-2 text-sm text-gray-700">2FA für alle Benutzer erforderlich</label>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Benachrichtigungseinstellungen</h2>
              <div className="space-y-3">
                {['enableEmailNotifications', 'enableSmsNotifications', 'enablePushNotifications'].map(key => (
                  <div key={key} className="flex items-center">
                    <input type="checkbox" checked={settings[key] || false} onChange={e => setSettings({ ...settings, [key]: e.target.checked })} className="h-4 w-4 text-blue-600 rounded" />
                    <label className="ml-2 text-sm text-gray-700">
                      {key === 'enableEmailNotifications' ? '📧 E-Mail Benachrichtigungen' :
                       key === 'enableSmsNotifications' ? '📱 SMS Benachrichtigungen' :
                       '🔔 Push Benachrichtigungen'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Backup-Einstellungen</h2>
              <div className="flex items-center mb-4">
                <input type="checkbox" checked={settings.autoBackupEnabled || false} onChange={e => setSettings({ ...settings, autoBackupEnabled: e.target.checked })} className="h-4 w-4 text-blue-600 rounded" />
                <label className="ml-2 text-sm text-gray-700">Automatische Backups aktivieren</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup-Intervall</label>
                  <select value={settings.backupInterval || 'daily'} onChange={e => setSettings({ ...settings, backupInterval: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aufbewahrung (Tage)</label>
                  <input type="number" value={settings.backupRetention || 30} onChange={e => setSettings({ ...settings, backupRetention: parseInt(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
            <button onClick={loadSettings} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
              Zurücksetzen
            </button>
            <button onClick={saveSettings} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Speichern...' : '💾 Einstellungen speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

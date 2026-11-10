import { useState, useEffect } from 'react';
import { brandingService } from '../../services/branding.service';
import { Upload, Trash2, Palette, MessageSquare, Image, Check, AlertCircle } from 'lucide-react';

export default function BrandingSettingsPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#1e40af');
  const [loginMessage, setLoginMessage] = useState('');

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      setLoading(true);
      const data = await brandingService.getBranding();
      setLogoUrl(data.logoUrl);
      setFaviconUrl(data.faviconUrl);
      setBrandColor(data.brandColor || '#1e40af');
      setLoginMessage(data.loginMessage || '');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Laden' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Datei zu groß. Maximal 5MB erlaubt.' });
      return;
    }

    try {
      setUploading('logo');
      const result = await brandingService.uploadLogo(file);
      setLogoUrl(result.logoUrl ?? null);
      setMessage({ type: 'success', text: 'Logo erfolgreich hochgeladen' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Hochladen' });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Datei zu groß. Maximal 5MB erlaubt.' });
      return;
    }

    try {
      setUploading('favicon');
      const result = await brandingService.uploadFavicon(file);
      setFaviconUrl(result.faviconUrl ?? null);
      setMessage({ type: 'success', text: 'Favicon erfolgreich hochgeladen' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Hochladen' });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await brandingService.deleteLogo();
      setLogoUrl(null);
      setMessage({ type: 'success', text: 'Logo gelöscht' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Löschen' });
    }
  };

  const handleDeleteFavicon = async () => {
    try {
      await brandingService.deleteFavicon();
      setFaviconUrl(null);
      setMessage({ type: 'success', text: 'Favicon gelöscht' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Löschen' });
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await brandingService.updateBranding({
        brandColor,
        loginMessage
      });
      setMessage({ type: 'success', text: 'Einstellungen gespeichert' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lade Branding-Einstellungen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Palette className="h-7 w-7 text-blue-600" />
          White-Label Branding
        </h1>
        <p className="text-gray-600 mt-1">
          Passen Sie das Erscheinungsbild an Ihre Firma an
        </p>
      </div>

      {/* Logo Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Image className="h-5 w-5" />
          Firmenlogo
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Ihr Logo wird in der Navigation und auf der Login-Seite angezeigt.
          Empfohlene Größe: 200x50px. Max. 5MB.
        </p>

        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            <div className="w-48 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-sm text-gray-400">Kein Logo</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              {uploading === 'logo' ? 'Lade hoch...' : 'Logo hochladen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={uploading !== null}
                className="hidden"
              />
            </label>

            {logoUrl && (
              <button
                onClick={handleDeleteLogo}
                disabled={uploading !== null}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Logo löschen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Image className="h-5 w-5" />
          Favicon (Browser-Tab Icon)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Das Favicon erscheint im Browser-Tab. Empfohlene Größe: 32x32px. Max. 5MB.
        </p>

        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">Kein Favicon</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              {uploading === 'favicon' ? 'Lade hoch...' : 'Favicon hochladen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleFaviconUpload}
                disabled={uploading !== null}
                className="hidden"
              />
            </label>

            {faviconUrl && (
              <button
                onClick={handleDeleteFavicon}
                disabled={uploading !== null}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Favicon löschen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brand Color & Message */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5" />
          Farben & Nachrichten
        </h2>

        <div className="space-y-6">
          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hauptfarbe (Brand Color)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-12 h-12 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#1e40af"
                className="px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              />
              <div
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: brandColor }}
              >
                Vorschau
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Diese Farbe wird für Buttons, Links und Akzente verwendet.
            </p>
          </div>

          {/* Login Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Willkommensnachricht auf Login-Seite
            </label>
            <textarea
              value={loginMessage}
              onChange={(e) => setLoginMessage(e.target.value)}
              placeholder="Willkommen bei Security Management Solutions!"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {loginMessage.length}/500 Zeichen. Diese Nachricht wird auf der Login-Seite angezeigt.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Vorschau
        </h2>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Mock Navigation */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: brandColor }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <div className="text-white font-bold text-lg">SMS</div>
            )}
            <div className="text-white/80 text-sm">Navigation</div>
          </div>

          {/* Mock Content */}
          <div className="p-6 bg-gray-50">
            <p className="text-gray-600 text-sm">
              So sieht Ihre Anwendung mit dem gewählten Branding aus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

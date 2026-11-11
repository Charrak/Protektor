/**
 * Branding Service
 * Handles tenant branding (logo, favicon, colors, messages)
 */

import { apiCall } from './api';

export interface BrandingSettings {
  tenantId: string | null;
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string;
  loginMessage: string;
}

export interface UploadResult {
  success: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  message: string;
}

// Standard-Branding-Werte (Fallback)
const defaultBranding: BrandingSettings = {
  tenantId: null,
  companyName: 'Security Management System',
  logoUrl: null,
  faviconUrl: null,
  brandColor: '#1e40af',
  loginMessage: 'Willkommen beim Security Management System'
};

export const brandingService = {
  /**
   * Get public branding (no auth required)
   * Used by login page to display logo and colors
   */
  async getBranding(): Promise<BrandingSettings> {
    try {
      // Öffentliche Route verwenden (ohne Auth)
      const data = await apiCall<{ branding: BrandingSettings }>('/branding');
      return { ...defaultBranding, ...data.branding };
    } catch (error) {
      // Bei Fehlern Standardwerte zurückgeben
      console.error('Failed to load branding:', error);
      return defaultBranding;
    }
  },

  async uploadLogo(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('logo', file);
    const data = await apiCall<UploadResult>('/branding/logo', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  async deleteLogo(): Promise<void> {
    await apiCall('/branding/logo', { method: 'DELETE' });
  },

  async uploadFavicon(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('favicon', file);
    const data = await apiCall<UploadResult>('/branding/favicon', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  async deleteFavicon(): Promise<void> {
    await apiCall('/branding/favicon', { method: 'DELETE' });
  },

  async updateBranding(settings: { brandColor?: string; loginMessage?: string }): Promise<BrandingSettings> {
    const data = await apiCall<{ branding: BrandingSettings }>('/branding/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data.branding;
  },
};

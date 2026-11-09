/**
 * Branding Service
 * Handles tenant branding (logo, favicon, colors, messages)
 */

import { apiCall } from './api';

export interface BrandingSettings {
  tenantId: string;
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string | null;
  loginMessage: string | null;
}

export interface UploadResult {
  success: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  message: string;
}

export const brandingService = {
  async getBranding(): Promise<BrandingSettings> {
    const data = await apiCall<{ branding: BrandingSettings }>('/branding/branding');
    return data.branding;
  },

  async uploadLogo(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('logo', file);
    const data = await apiCall<UploadResult>('/branding/branding/logo', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  async deleteLogo(): Promise<void> {
    await apiCall('/branding/branding/logo', { method: 'DELETE' });
  },

  async uploadFavicon(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('favicon', file);
    const data = await apiCall<UploadResult>('/branding/branding/favicon', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  async deleteFavicon(): Promise<void> {
    await apiCall('/branding/branding/favicon', { method: 'DELETE' });
  },

  async updateBranding(settings: { brandColor?: string; loginMessage?: string }): Promise<BrandingSettings> {
    const data = await apiCall<{ branding: BrandingSettings }>('/branding/branding', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data.branding;
  },
};

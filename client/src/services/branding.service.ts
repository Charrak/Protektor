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
  /**
   * Get current branding settings
   */
  async getBranding(): Promise<BrandingSettings> {
    const data = await apiCall<{ branding: BrandingSettings }>('/api/v1/branding/branding');
    return data.branding;
  },

  /**
   * Upload company logo
   */
  async uploadLogo(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('logo', file);

    const data = await apiCall<UploadResult>('/api/v1/branding/branding/logo', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  /**
   * Delete company logo
   */
  async deleteLogo(): Promise<void> {
    await apiCall('/api/v1/branding/branding/logo', {
      method: 'DELETE',
    });
  },

  /**
   * Upload favicon
   */
  async uploadFavicon(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('favicon', file);

    const data = await apiCall<UploadResult>('/api/v1/branding/branding/favicon', {
      method: 'POST',
      body: formData,
    });
    return data;
  },

  /**
   * Delete favicon
   */
  async deleteFavicon(): Promise<void> {
    await apiCall('/api/v1/branding/branding/favicon', {
      method: 'DELETE',
    });
  },

  /**
   * Update branding settings
   */
  async updateBranding(settings: {
    brandColor?: string;
    loginMessage?: string;
  }): Promise<BrandingSettings> {
    const data = await apiCall<{ branding: BrandingSettings }>('/api/v1/branding/branding', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data.branding;
  },
};

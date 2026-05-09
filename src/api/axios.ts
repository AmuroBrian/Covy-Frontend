import axios from 'axios';
import { encryptPayload, decryptResponse } from '../utils/encryption.util';
import { OverlayManager } from '../context/OverlayManager';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.EXPO_PUBLIC_FRONTEND_API_KEY,
  },
});

// Request Interceptor: Encrypt payload if present
apiClient.interceptors.request.use(
  async (config) => {
    // Only encrypt if there's a JSON payload
    if (config.data && typeof config.data === 'object') {
      try {
        const encryptedData = await encryptPayload(config.data);
        // The Covy backend expects the body to be wrapped in a 'payload' property
        config.data = { payload: encryptedData };
        // Tell the backend that this payload is encrypted so it triggers the EncryptionInterceptor
        config.headers['x-encrypted-payload'] = 'true';
      } catch (error) {
        console.error('Failed to encrypt request payload', error);
        return Promise.reject(error);
      }
    }
    return config;
  },
  (error) => {
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      OverlayManager.showOffline();
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Decrypt response if encrypted
apiClient.interceptors.response.use(
  async (response) => {
    // If the backend returns an encrypted payload, decrypt it
    const encryptedString = response.data?.payload || response.data?.encryptedData;
    if (encryptedString) {
      try {
        const decryptedData = await decryptResponse(encryptedString);
        response.data = decryptedData;
      } catch (error) {
        console.error('Failed to decrypt response', error);
        return Promise.reject(error);
      }
    }
    // If request succeeds, we are obviously online
    OverlayManager.hideOffline();
    return response;
  },
  (error) => {
    if (!error.response) {
      // Network error (server dead)
      OverlayManager.showOffline();
    } else if (error.response.status >= 500) {
      // Server error
      OverlayManager.showOffline();
    } else {
      // It's a 4xx error (validation, auth, etc) which means server is online
      OverlayManager.hideOffline();
    }
    return Promise.reject(error);
  }
);

export default apiClient;

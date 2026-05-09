import axios from 'axios';
import { encryptPayload, decryptResponse } from '../utils/encryption.util';

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
      } catch (error) {
        console.error('Failed to encrypt request payload', error);
        return Promise.reject(error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Decrypt response if encrypted
apiClient.interceptors.response.use(
  async (response) => {
    // If the backend returns an encrypted payload, decrypt it
    if (response.data && response.data.payload) {
      try {
        const decryptedData = await decryptResponse(response.data.payload);
        response.data = decryptedData;
      } catch (error) {
        console.error('Failed to decrypt response', error);
        return Promise.reject(error);
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;

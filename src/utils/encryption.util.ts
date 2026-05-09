import { Buffer } from 'buffer';

/**
 * AES-256-GCM End-to-End Encryption Utility
 * This encrypts payloads sent to the Covy Backend and decrypts the responses.
 *
 * NOTE: Ensure you have a polyfill for 'crypto' and 'buffer' if using React Native,
 * for example by using `react-native-crypto` or Web Crypto API in standard React.
 */

// These should be loaded from your frontend environment variables (.env)
// Make sure this matches the backend exactly.
const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'your-32-byte-secure-encryption-key-here'; 
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a JSON payload into a base64 string using AES-256-GCM
 */
export async function encryptPayload(payload: any): Promise<string> {
  const textToEncrypt = JSON.stringify(payload);
  const enc = new TextEncoder();
  const encodedText = enc.encode(textToEncrypt);

  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Import the key
  const keyData = enc.encode(ENCRYPTION_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedText
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  
  // AES-GCM appends the auth tag at the end of the ciphertext.
  // The format we'll send to the backend: iv:ciphertext
  
  const ivBase64 = Buffer.from(iv).toString('base64');
  const cipherBase64 = Buffer.from(encryptedArray).toString('base64');

  return `${ivBase64}:${cipherBase64}`;
}

/**
 * Decrypts a base64 response payload from the backend using AES-256-GCM
 */
export async function decryptResponse(encryptedString: string): Promise<any> {
  const parts = encryptedString.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted payload format');

  const [ivBase64, cipherBase64] = parts;
  
  const iv = Buffer.from(ivBase64, 'base64');
  const cipherData = Buffer.from(cipherBase64, 'base64');

  const enc = new TextEncoder();
  const keyData = enc.encode(ENCRYPTION_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      cipherData
    );

    const dec = new TextDecoder();
    const decryptedText = dec.decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Check if encryption keys match.');
  }
}

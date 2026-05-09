import forge from 'node-forge';

const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'your-32-byte-secure-encryption-key-here'; 
const IV_LENGTH = 16;

// Ensure key is exactly 32 bytes (256 bits) for AES-256
const keyBytes = forge.util.createBuffer(ENCRYPTION_KEY, 'utf8').getBytes();

export async function encryptPayload(payload: any): Promise<string> {
  const textToEncrypt = JSON.stringify(payload);
  
  // Generate random IV
  const ivBytes = forge.random.getBytesSync(IV_LENGTH);
  
  const cipher = forge.cipher.createCipher('AES-GCM', keyBytes);
  cipher.start({
    iv: ivBytes,
    tagLength: 128 // 16 bytes
  });
  cipher.update(forge.util.createBuffer(textToEncrypt, 'utf8'));
  cipher.finish();
  
  // node-forge outputs the ciphertext and the tag separately
  const encryptedBytes = cipher.output.getBytes();
  const tagBytes = cipher.mode.tag.getBytes();
  
  // WebCrypto (and the backend) expects the tag to be appended to the ciphertext
  const cipherWithTag = encryptedBytes + tagBytes;
  
  // Convert to Base64
  const ivBase64 = forge.util.encode64(ivBytes);
  const cipherBase64 = forge.util.encode64(cipherWithTag);
  
  return `${ivBase64}:${cipherBase64}`;
}

export async function decryptResponse(encryptedString: string): Promise<any> {
  if (!encryptedString) return null;
  const parts = encryptedString.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted payload format');

  const [ivBase64, cipherBase64] = parts;
  
  const ivBytes = forge.util.decode64(ivBase64);
  const cipherWithTagBytes = forge.util.decode64(cipherBase64);
  
  // The last 16 bytes are the auth tag
  const tagLengthBytes = 16;
  const encryptedBytes = cipherWithTagBytes.slice(0, cipherWithTagBytes.length - tagLengthBytes);
  const tagBytes = cipherWithTagBytes.slice(cipherWithTagBytes.length - tagLengthBytes);
  
  const decipher = forge.cipher.createDecipher('AES-GCM', keyBytes);
  decipher.start({
    iv: ivBytes,
    tagLength: 128,
    tag: forge.util.createBuffer(tagBytes)
  });
  decipher.update(forge.util.createBuffer(encryptedBytes));
  const pass = decipher.finish();
  
  if (!pass) {
    throw new Error('Decryption failed. Check if encryption keys match or data was tampered.');
  }
  
  const decryptedText = forge.util.decodeUtf8(decipher.output.getBytes());
  return JSON.parse(decryptedText);
}

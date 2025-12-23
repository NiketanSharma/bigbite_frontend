// Simple encryption utility for payment data
// Uses Base64 encoding with HMAC signature to prevent tampering

const SECRET_KEY = import.meta.env.VITE_PAYMENT_SECRET || 'bigbite-payment-secret-2024';

// Function to create HMAC signature
async function createSignature(data) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Encrypt payment data
export async function encryptPaymentData(data) {
  try {
    const jsonString = JSON.stringify(data);
    const base64Data = btoa(jsonString);
    const signature = await createSignature(base64Data);
    
    // Combine data and signature
    return `${base64Data}.${signature}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt payment data');
  }
}

// Decrypt and verify payment data
export async function decryptPaymentData(encryptedData) {
  try {
    const [base64Data, signature] = encryptedData.split('.');
    
    if (!base64Data || !signature) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Verify signature
    const expectedSignature = await createSignature(base64Data);
    if (signature !== expectedSignature) {
      throw new Error('Data tampering detected - signature mismatch');
    }
    
    // Decode data
    const jsonString = atob(base64Data);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt payment data');
  }
}

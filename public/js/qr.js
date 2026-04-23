// Client-side QR code generation using free qrcode.js library
// No subscription needed - uses CDN

export async function generateQRCode(data) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    // Use QRCode.js loaded globally from CDN
    if (typeof QRCode === 'undefined') {
      reject(new Error('QRCode library not loaded'));
      return;
    }
    QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H'
    }, (err, url) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
}

export function encodeQRPayload(registrationId, eventId, studentId) {
  const payload = {
    r: registrationId,
    e: eventId,
    s: studentId,
    t: Date.now()
  };
  return btoa(JSON.stringify(payload));
}

export function decodeQRPayload(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

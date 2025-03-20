export function generateUUID(): `${string}-${string}-${string}-${string}-${string}` {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }) as `${string}-${string}-${string}-${string}-${string}`;
}

// Create a global crypto object if it doesn't exist
declare global {
  var crypto: {
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
  };
}

// Ensure crypto exists in global scope
if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = {
    randomUUID: generateUUID
  };
} else if (!crypto.randomUUID) {
  crypto.randomUUID = generateUUID;
}

// Also ensure it exists in window scope
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {
      randomUUID: generateUUID
    };
  } else if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = generateUUID;
  }
} 
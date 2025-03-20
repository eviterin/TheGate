declare global {
  interface Crypto {
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
  }
}

// Ensure crypto exists
if (typeof crypto === 'undefined') {
  (window as any).crypto = {};
}

// Polyfill randomUUID if it doesn't exist
if (!crypto.randomUUID) {
  const generateUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };

  Object.defineProperty(crypto, 'randomUUID', {
    value: generateUUID,
    configurable: true,
    writable: true
  });
} 
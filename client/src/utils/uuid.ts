export function generateUUID(): `${string}-${string}-${string}-${string}-${string}` {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }) as `${string}-${string}-${string}-${string}-${string}`;
}

// Override crypto.randomUUID if it doesn't exist
if (typeof window !== 'undefined' && (!window.crypto?.randomUUID)) {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  window.crypto.randomUUID = generateUUID;
} 
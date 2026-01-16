// 01-url-shortener/src/codegen.ts

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEFAULT_LENGTH = 6;

/**
 * Generates a random Base62 string.
 * This will be used as the 'code' for shortened URLs.
 */
export function generateBase62Code(length: number = DEFAULT_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Encodes a numeric ID to Base62 (useful if using counter-based IDs).
 */
export function encodeIdToBase62(id: number): string {
  if (id === 0) return ALPHABET;
  let encoded = "";
  while (id > 0) {
    encoded = ALPHABET[id % 62] + encoded;
    id = Math.floor(id / 62);
  }
  return encoded;
}
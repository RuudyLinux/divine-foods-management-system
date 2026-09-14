/**
 * Password hashing for staff logins.
 *
 * Passwords are never stored. Each account keeps a random salt and a PBKDF2
 * derived key, so the stored record cannot be read back into a password.
 *
 * Scope, stated plainly: this app keeps its data in the browser, so this
 * protects stored credentials from being read by anyone who opens the database
 * (developer tools, an exported backup, a shared computer). It is not a
 * substitute for a server: anyone who can modify the code running in their own
 * browser can bypass any client-side check. Server-side authentication is
 * required before this is exposed to an untrusted network.
 */

const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

export interface PasswordRecord {
  password_hash: string;
  password_salt: string;
}

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('This browser cannot hash passwords securely. Please use an updated browser.');
  }
  return c;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const crypto = getCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return toBase64(new Uint8Array(bits));
}

/** Builds the stored record for a new or changed password. */
export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = getCrypto().getRandomValues(new Uint8Array(SALT_BYTES));
  return {
    password_hash: await derive(password, salt),
    password_salt: toBase64(salt),
  };
}

/**
 * Checks a password against a stored record.
 * Compared in constant time so a wrong guess cannot be narrowed down by timing.
 */
export async function verifyPassword(
  password: string,
  record: Partial<PasswordRecord> | undefined
): Promise<boolean> {
  if (!record?.password_hash || !record?.password_salt) return false;

  let candidate: string;
  try {
    candidate = await derive(password, fromBase64(record.password_salt));
  } catch {
    return false;
  }

  const a = new TextEncoder().encode(candidate);
  const b = new TextEncoder().encode(record.password_hash);
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export const MIN_PASSWORD_LENGTH = 8;

/** Returns a problem to show the user, or null when the password is acceptable. */
export function describePasswordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers.';
  }
  if (/^(password|divine|admin|12345678)/i.test(password)) {
    return 'That password is too easy to guess. Please choose another.';
  }
  return null;
}

/*
 * There is deliberately no default password here.
 *
 * Everything in this file ships to the browser, so any credential written into
 * it can be read by anyone who opens the deployed bundle. A new installation
 * instead starts with no usable credentials, and the first visitor is asked to
 * create the administrator password (see db.needsFirstRunSetup).
 */

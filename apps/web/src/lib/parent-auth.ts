'use client';

const TOKEN_KEY = 'parent_token';
const PARENT_KEY = 'parent_info';

export function getParentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setParentSession(token: string, parent: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PARENT_KEY, JSON.stringify(parent));
}

export function getParentInfo(): any | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem(PARENT_KEY);
  return s ? JSON.parse(s) : null;
}

export function clearParentSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PARENT_KEY);
}

export function isParentLoggedIn(): boolean {
  return !!getParentToken();
}

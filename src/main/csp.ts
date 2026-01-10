/**
 * Dynamic Content Security Policy (CSP) generator
 * Generates environment-specific CSP to avoid exposing internal infrastructure in production
 */

import { app } from 'electron';

export function getCSP(): string {
  const isDev = !app.isPackaged;

  const connectSrc = ["'self'"];

  // Add API endpoint based on environment
  if (isDev) {
    // Development mode: allow localhost and HMR websockets
    connectSrc.push('http://127.0.0.1:4000', 'http://localhost:4000');
    connectSrc.push('ws://127.0.0.1:5173', 'ws://localhost:5173'); // Vite HMR
  } else {
    // Production/Staging: get API base from environment variable
    const apiBase = process.env.RENDERER_VITE_API_BASE;
    if (apiBase) {
      try {
        const url = new URL(apiBase);
        const origin = `${url.protocol}//${url.host}`;
        if (!connectSrc.includes(origin)) {
          connectSrc.push(origin);
        }
      } catch (e) {
        console.error('[CSP] Invalid API base URL:', apiBase, e);
      }
    }
  }

  // Generate CSP string
  const csp = `
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://cdn.svar.dev;
    img-src 'self' data: blob:;
    font-src 'self' data: https://cdn.svar.dev;
    connect-src ${connectSrc.join(' ')};
  `.replace(/\s+/g, ' ').trim();

  console.log('[CSP] Generated CSP:', csp);
  return csp;
}

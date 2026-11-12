// Netlify Function: alle Anfragen unter /api/* (Konten, Spiele, Spielstand, Aktionen)
import { getStore } from '@netlify/blobs';
import { handle } from '../../server/api.mjs';

export default async (req, context) => handle(req, { store: getStore({ name: 'skymarket', consistency: 'strong' }), geo: (context && context.geo) || null });   // 0.21.80: Land der Verbindung für den Fair-Play-Wächter (keine IP)

export const config = { path: '/api/*' };

// Netlify Function: alle Anfragen unter /api/* (Konten, Spiele, Spielstand, Aktionen)
import { getStore } from '@netlify/blobs';
import { handle } from '../../server/api.mjs';

export default async (req) => handle(req, { store: getStore({ name: 'skymarket', consistency: 'strong' }) });

export const config = { path: '/api/*' };

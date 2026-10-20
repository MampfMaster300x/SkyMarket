// Netlify Scheduled Function: schreibt die Hauptwelt stündlich fort, auch wenn niemand online ist.
import { getStore } from '@netlify/blobs';
import { tickMain } from '../../server/api.mjs';

export default async () => {
  const r = await tickMain(getStore({ name: 'skymarket', consistency: 'strong' }));
  console.log('Hauptwelt-Tick', JSON.stringify(r));
};

export const config = { schedule: '@hourly' };

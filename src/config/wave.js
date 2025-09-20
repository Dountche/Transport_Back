const axios = require('axios');

const WAVE_API_BASE = process.env.WAVE_API_BASE || 'https://api.wave.com';
const WAVE_API_KEY = process.env.WAVE_API_KEY;
const DEFAULT_TIMEOUT = parseInt(process.env.WAVE_TIMEOUT || '10000', 10);

const waveClient = axios.create({
  baseURL: WAVE_API_BASE,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WAVE_API_KEY}`
  }
});


function buildMutatingHeaders(idempotencyKey) {
  const headers = {
    'Idempotency-Key': idempotencyKey,
    'Content-Type': 'application/json'
  };
  return headers;
}

module.exports = { waveClient, buildMutatingHeaders };

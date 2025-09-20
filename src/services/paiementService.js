const { waveClient, buildMutatingHeaders } = require('../config/wave');
const { v4: uuidv4 } = require('uuid');

//appel de l'api de wave pour creer un paiement

async function createPayout({ amount, currency = 'XOF', mobile, name = null, client_reference = null, payment_reason = null }) {
  const idempotencyKey = uuidv4();

  const body = {
    currency,
    receive_amount: String(Math.round(amount)),
    mobile,
  };
  if (name) body.name = name;
  if (client_reference) body.client_reference = client_reference;
  if (payment_reason) body.payment_reason = payment_reason;

  try {
    const res = await waveClient.post('/v1/payout', body, {
      headers: buildMutatingHeaders(idempotencyKey)
    });
    //wave retourne un objet paiements avec l'id; le statut, les frais...
    return { success: true, data: res.data, idempotencyKey };
  } catch (err) {
    const detail = err.response ? (err.response.data || err.response.statusText) : err.message;
    return { success: false, error: detail, status: err.response?.status || null };
  }
}

 //recuperer  un paiement par id
 
async function getPayout(payoutId) {
  try {
    const res = await waveClient.get(`/v1/payout/${encodeURIComponent(payoutId)}`);
    return { success: true, data: res.data };
  } catch (err) {
    const detail = err.response ? (err.response.data || err.response.statusText) : err.message;
    return { success: false, error: detail, status: err.response?.status || null };
  }
}

module.exports = { createPayout, getPayout };

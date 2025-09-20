const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { redisClient, ValidatedRedistConnection } = require('../config/redis');
const { encryptJSON, decryptJSON } = require('../utils/crypto');
const { Ticket } = require('../models');
const QR_TTL = parseInt(process.env.QR_TTL || '900', 10);

// Lua atomique pour validation
const LUA_VALIDATE = `
local key = KEYS[1]
local used_by = ARGV[1]
local used_at = ARGV[2]
local raw = redis.call('GET', key)
if not raw then
  return cjson.encode({ ok = false, reason = 'NOT_FOUND' })
end
local obj = cjson.decode(raw)
-- vérification expiration (si présente)
if obj.expires_at and obj.expires_at < used_at then
  return cjson.encode({ ok = false, reason = 'EXPIRED' })
end
if obj.used == true then
  return cjson.encode({ ok = false, reason = 'ALREADY_USED', obj = obj })
end
obj.used = true
obj.used_at = used_at
obj.used_by = used_by
-- Préserver le TTL existant
local ttl = redis.call('TTL', key)
redis.call('SET', key, cjson.encode(obj))
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end
return cjson.encode({ ok = true, obj = obj })
`;

async function generateQRForTicket({ ticketId, utilisateurId = null, montant = null, type = 'ticket' }) {
    try {
        console.log(`[QR Service] Début génération QR - Ticket ID: ${ticketId}`);

        // S’assurer que Redis est connecté
        await ValidatedRedistConnection();

        const ticket = await Ticket.findByPk(ticketId);
        if (!ticket) throw new Error(`Ticket ${ticketId} introuvable`);

        const qrId = uuidv4();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + QR_TTL * 1000).toISOString();

        const payload = {
            qr_id: qrId,
            ticket_id: ticket.id,
            utilisateur_id: utilisateurId || ticket.utilisateur_id,
            montant,
            type,
            created_at: createdAt,
            expires_at: expiresAt,
            nonce: uuidv4()
        };

        console.log(`[QR Service] Payload créé:`, { qr_id: qrId, ticket_id: ticket.id });

        const token = encryptJSON(payload);
        console.log(`[QR Service] Token chiffré généré: ${token.substring(0, 30)}...`);

        const key = `qr:${qrId}`;
        const meta = {
            qr_id: qrId,
            ticket_id: payload.ticket_id,
            utilisateur_id: payload.utilisateur_id,
            montant: payload.montant,
            created_at: createdAt,
            expires_at: expiresAt,
            used: false
        };

        await redisClient.set(key, JSON.stringify(meta), { EX: QR_TTL });
        console.log(`[QR Service] Métadonnées sauvegardées avec TTL ${QR_TTL}s`);

        const qr_png_base64 = await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
        });

        return { qr_id: qrId, token, qr_png_base64, meta, success: true };
    } catch (error) {
        console.error("[QR Service] Erreur génération QR:", error);
        throw new Error(`Erreur génération QR: ${error.message}`);
    }
}

async function validateQRToken(token, validatorId = 'validator-service') {
    try {
        console.log(`[QR Service] Début validation token: ${token.substring(0, 20)}...`);

        await ValidatedRedistConnection();

        let payload;
        try {
            payload = decryptJSON(token);
        } catch (err) {
            return { valid: false, reason: 'INVALID_TOKEN', detail: err.message };
        }

        const qrId = payload.qr_id;
        const ticketId = payload.ticket_id;
        if (!qrId || !ticketId) {
            return { valid: false, reason: 'NO_QR_OR_TICKET_ID' };
        }

        console.log(`[QR Service] Token déchiffré - QR ID: ${qrId}, Ticket ID: ${ticketId}`);

        const key = `qr:${qrId}`;
        const now = new Date().toISOString();

        console.log('[QR Service] Call redis.eval with:', { key, args: [String(validatorId), String(now)] });

        let res;
        try {
            res = await redisClient.eval(LUA_VALIDATE, {
                keys: [key],
                arguments: [String(validatorId), String(now)]
            });
        } catch (err) {
            console.error('[QR Service] Redis eval error:', err);
            return { valid: false, reason: 'REDIS_ERROR', detail: err.message };
        }

        let parsed;
        try {
            parsed = JSON.parse(res);
        } catch (e) {
            return { valid: false, reason: 'REDIS_PARSE_ERROR', raw: res };
        }

        if (!parsed.ok) {
            return { valid: false, reason: parsed.reason, obj: parsed.obj || null };
        }

        const obj = parsed.obj;

        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (ticket) {
                await ticket.update({ statut_validation: true });
                console.log(`[QR Service] Ticket ${ticketId} marqué comme validé`);
            }
        } catch (err) {
            console.error('[QR Service] Erreur update ticket statut:', err);
        }

        try {
            await redisClient.publish('qr_events', JSON.stringify({
                event: 'qr_validated',
                qr_id: obj.qr_id,
                ticket_id: obj.ticket_id,
                utilisateur_id: obj.utilisateur_id,
                used_by: obj.used_by,
                used_at: obj.used_at
            }));
        } catch (err) {
            console.error('[QR Service] Redis publish error:', err);
        }

        return { valid: true, qr: obj, payload };
    } catch (error) {
        return { valid: false, reason: 'VALIDATION_ERROR', detail: error.message };
    }
}

module.exports = { generateQRForTicket, validateQRToken };

const crypto = require('crypto');
require('dotenv').config();

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_HEX = process.env.AES_SECRET || '';

if (!KEY_HEX || KEY_HEX.length !== 64) {
    console.warn('AES_SECRET manquant ou invalide (doit être 64 hex chars)');
}
const KEY = Buffer.from(KEY_HEX, 'hex');

function encryptJSON(obj) {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const plaintext = JSON.stringify(obj);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted}`;
}


function decryptJSON(token) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Token format invalide');
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
}

module.exports = { encryptJSON, decryptJSON };

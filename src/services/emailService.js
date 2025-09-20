const nodemailer = require('nodemailer');
const { redisClient, ValidatedRedistConnection } = require('../config/redis');
const crypto = require('crypto');

// Configuration du transporteur email corrigée
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true pour 465, false pour autres ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Vérifier la configuration email
transporter.verify((error, success) => {
    if (error) {
        console.error('[Email Service] Configuration invalide:', error);
    } else {
        console.log('[Email Service] Prêt à envoyer des emails');
    }
});

/**
 * Génère un code de vérification à 6 chiffres
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Génère un token sécurisé pour les liens
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Envoie un code de vérification email pour l'inscription
 */
async function sendEmailVerification(email, nom) {
    try {
        await ValidatedRedistConnection();

        const code = generateVerificationCode();
        const key = `email_verification:${email}`;
        
        // Stocker le code avec TTL de 10 minutes
        await redisClient.setEx(key, 600, code);

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Transport API'}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Vérification de votre adresse email',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Vérification Email</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333;">Bonjour ${nom},</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        Merci de vous être inscrit sur notre plateforme de transport. 
                        Pour finaliser votre inscription, veuillez utiliser le code de vérification ci-dessous :
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #007bff; color: white; font-size: 32px; font-weight: bold; 
                                    padding: 20px; border-radius: 10px; letter-spacing: 5px; display: inline-block;">
                            ${code}
                        </div>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        <strong>Ce code expire dans 10 minutes.</strong><br>
                        Si vous n'avez pas demandé cette vérification, ignorez ce message.
                    </p>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} ${process.env.APP_NAME || 'Transport API'}. Tous droits réservés.
                    </p>
                </div>
            </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`[Email Service] Code de vérification envoyé à ${email}`);
        return { success: true, message: 'Code de vérification envoyé' };

    } catch (error) {
        console.error('[Email Service] Erreur envoi email:', error);
        throw new Error(`Erreur envoi email: ${error.message}`);
    }
}

/**
 * Vérifie le code de vérification email
 */
async function verifyEmailCode(email, code) {
    try {
        await ValidatedRedistConnection();

        const key = `email_verification:${email}`;
        const storedCode = await redisClient.get(key);

        if (!storedCode) {
            return { valid: false, reason: 'Code expiré ou inexistant' };
        }

        if (storedCode !== code) {
            return { valid: false, reason: 'Code incorrect' };
        }

        // Supprimer le code après vérification réussie
        await redisClient.del(key);
        
        console.log(`[Email Service] Email vérifié avec succès: ${email}`);
        return { valid: true };

    } catch (error) {
        console.error('[Email Service] Erreur vérification code:', error);
        throw new Error(`Erreur vérification: ${error.message}`);
    }
}

/**
 * Envoie un lien de réinitialisation de mot de passe
 */
async function sendPasswordReset(email, nom) {
    try {
        await ValidatedRedistConnection();

        const token = generateSecureToken();
        const key = `password_reset:${token}`;
        
        // Stocker l'email associé au token avec TTL de 1 heure
        await redisClient.setEx(key, 3600, email);

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Transport API'}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Réinitialisation du mot de passe</h1>
                </div>
                
                <div style="padding: 30px; background: #f8f9fa;">
                    <h2 style="color: #333;">Bonjour ${nom},</h2>
                    
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        Vous avez demandé la réinitialisation de votre mot de passe. 
                        Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: #dc3545; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;
                                  display: inline-block;">
                            Réinitialiser mon mot de passe
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        <strong>Ce lien expire dans 1 heure.</strong><br>
                        Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                        <a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a>
                    </p>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} ${process.env.APP_NAME || 'Transport API'}. Tous droits réservés.
                    </p>
                </div>
            </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`[Email Service] Lien de réinitialisation envoyé à ${email}`);
        return { success: true, token };

    } catch (error) {
        console.error('[Email Service] Erreur envoi reset:', error);
        throw new Error(`Erreur envoi reset: ${error.message}`);
    }
}

/**
 * Vérifie un token de réinitialisation
 */
async function verifyResetToken(token) {
    try {
        await ValidatedRedistConnection();

        const key = `password_reset:${token}`;
        const email = await redisClient.get(key);

        if (!email) {
            return { valid: false, reason: 'Token expiré ou invalide' };
        }

        return { valid: true, email };

    } catch (error) {
        console.error('[Email Service] Erreur vérification token:', error);
        throw new Error(`Erreur vérification token: ${error.message}`);
    }
}

/**
 * Consomme un token de réinitialisation (l'invalide après usage)
 */
async function consumeResetToken(token) {
    try {
        await ValidatedRedistConnection();

        const key = `password_reset:${token}`;
        const email = await redisClient.get(key);

        if (!email) {
            return { valid: false, reason: 'Token expiré ou invalide' };
        }

        // Supprimer le token après utilisation
        await redisClient.del(key);
        
        return { valid: true, email };

    } catch (error) {
        console.error('[Email Service] Erreur consommation token:', error);
        throw new Error(`Erreur consommation token: ${error.message}`);
    }
}

module.exports = { sendEmailVerification, verifyEmailCode, sendPasswordReset, verifyResetToken, consumeResetToken };

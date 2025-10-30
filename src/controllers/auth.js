const bcrypt = require("bcrypt");
const Joi = require("joi");
const { generateToken } = require("../config/jwt");
const { Utilisateur, Role } = require("../models");
const { sendEmailVerification, verifyEmailCode, sendPasswordReset, verifyResetToken, consumeResetToken } = require("../services/emailService");

// Demande de vérification email pour inscription
const requestEmailVerification = async (req, res) => {
    const schema = Joi.object({
        nom: Joi.string().min(2).required(),
        email: Joi.string().email().required(),
        telephone: Joi.string().required(),
        mot_de_passe: Joi.string().min(8).required(),
        role: Joi.string().valid('client', 'chauffeur', 'admin').default('client') // rôle avec défaut client
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        const { nom, email, telephone, mot_de_passe, role } = value;

        // Vérifier si l'email existe déjà
        const userExists = await Utilisateur.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: "Email déjà utilisé" });
        }

        // Vérifier que le rôle existe
        const roleData = await Role.findOne({ where: { nom: role } });
        if (!roleData) {
            return res.status(400).json({ message: "Rôle invalide" });
        }

        // Stocker temporairement les données utilisateur dans Redis
        const { redisClient, ValidatedRedistConnection } = require('../config/redis');
        await ValidatedRedistConnection();

        const tempUserKey = `temp_user:${email}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

        const tempUserData = {
            nom,
            email,
            telephone,
            mot_de_passe_hash: hashedPassword,
            role_id: roleData.id,
            role_nom: roleData.nom,
            timestamp: new Date().toISOString()
        };

        // Stocker pour 15 minutes
        await redisClient.setEx(tempUserKey, 900, JSON.stringify(tempUserData));

        // Envoyer le code de vérification avec mention du rôle
        await sendEmailVerification(email, nom, roleData.nom);

        console.log(`[Auth] Demande d'inscription - Email: ${email}, Rôle: ${role}`);

        return res.status(200).json({
            message: "Code de vérification envoyé à votre adresse email",
            email: email,
            role: role
        });

    } catch (error) {
        console.error('[Auth] Erreur request verification:', error);
        return res.status(500).json({ 
            message: "Erreur lors de l'envoi du code de vérification",
            detail: error.message 
        });
    }
};

// Vérification du code et création du compte
const verifyAndRegister = async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        code: Joi.string().length(6).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        const { email, code } = req.body;

        // Vérifier le code
        const codeVerification = await verifyEmailCode(email, code);
        if (!codeVerification.valid) {
            return res.status(400).json({ message: codeVerification.reason });
        }

        // Récupérer les données temporaires
        const { redisClient, ValidatedRedistConnection } = require('../config/redis');
        await ValidatedRedistConnection();

        const tempUserKey = `temp_user:${email}`;
        const tempUserDataStr = await redisClient.get(tempUserKey);

        if (!tempUserDataStr) {
            return res.status(400).json({ 
                message: "Données d'inscription expirées. Veuillez recommencer l'inscription." 
            });
        }

        const tempUserData = JSON.parse(tempUserDataStr);

        // Créer l'utilisateur en base avec le rôle
        const utilisateur = await Utilisateur.create({
            nom: tempUserData.nom,
            email: tempUserData.email,
            telephone: tempUserData.telephone,
            mot_de_passe_hash: tempUserData.mot_de_passe_hash,
            role_id: tempUserData.role_id,
            date_inscription: new Date()
        });

        // Récupérer l'utilisateur avec son rôle pour la réponse
        const utilisateurWithRole = await Utilisateur.findByPk(utilisateur.id, {
            include: [{
                model: Role,
                as: 'role'
            }]
        });

        // Supprimer les données temporaires
        await redisClient.del(tempUserKey);

        // Générer le token JWT avec le rôle
        const token = generateToken({ 
            id: utilisateur.id, 
            email: utilisateur.email,
            role: utilisateurWithRole.role?.nom || 'client'
        });

        // Retourner les données sans le mot de passe
        const { mot_de_passe_hash, ...utilisateurData } = utilisateurWithRole.toJSON();

        console.log(`[Auth] Utilisateur créé - ID: ${utilisateur.id}, Rôle: ${utilisateurWithRole.role?.nom}`);

        return res.status(201).json({ 
            message: "Compte créé avec succès",
            utilisateur: utilisateurData, 
            token 
        });

    } catch (error) {
        console.error('[Auth] Erreur verify and register:', error);
        return res.status(500).json({ 
            message: "Erreur lors de la création du compte",
            detail: error.message 
        });
    }
};


// Connexion
const login = async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        mot_de_passe: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    try {
        const { email, mot_de_passe } = req.body;

        // Récupérer l'utilisateur avec son rôle
        const utilisateur = await Utilisateur.findOne({ 
            where: { email },
            include: [{
                model: Role,
                as: 'role'
            }]
        });

        if (!utilisateur) {
            return res.status(400).json({ message: "Utilisateur introuvable" });
        }

        const validPassword = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe_hash);
        if (!validPassword) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }

        // Générer le token JWT avec le rôle
        const token = generateToken({ 
            id: utilisateur.id, 
            email: utilisateur.email,
            role: utilisateur.role?.nom || 'client'
        });

        const { mot_de_passe_hash, ...utilisateurData } = utilisateur.toJSON();

        console.log(`[Auth] Connexion réussie - ID: ${utilisateur.id}, Rôle: ${utilisateur.role?.nom}`);

        return res.status(200).json({ 
            utilisateur: utilisateurData, 
            token,
            role: utilisateur.role?.nom 
        });

    } catch (error) {
        console.error('[Auth] Erreur login:', error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

// Demande de réinitialisation de mot de passe
const requestPasswordReset = async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        const { email } = req.body;

        // Vérifier que l'utilisateur existe
        const utilisateur = await Utilisateur.findOne({ where: { email } });
        if (!utilisateur) {
            // Pour la sécurité, on ne révèle pas si l'email existe ou non
            return res.status(200).json({
                message: "Si cet email existe, un lien de réinitialisation a été envoyé"
            });
        }

        // Envoyer le lien de réinitialisation
        await sendPasswordReset(email, utilisateur.nom);

        return res.status(200).json({
            message: "Si cet email existe, un lien de réinitialisation a été envoyé"
        });

    } catch (error) {
        console.error('[Auth] Erreur request password reset:', error);
        return res.status(500).json({
            message: "Erreur lors de l'envoi du lien de réinitialisation"
        });
    }
};

// Vérification du token de réinitialisation
const verifyPasswordResetToken = async (req, res) => {
    const schema = Joi.object({
        token: Joi.string().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: "Token requis" });
    }

    try {
        const { token } = req.params;

        const tokenVerification = await verifyResetToken(token);
        if (!tokenVerification.valid) {
            return res.status(400).json({ 
                message: "Token invalide ou expiré",
                valid: false 
            });
        }

        return res.status(200).json({
            message: "Token valide",
            valid: true,
            email: tokenVerification.email
        });

    } catch (error) {
        console.error('[Auth] Erreur verify reset token:', error);
        return res.status(500).json({
            message: "Erreur vérification du token"
        });
    }
};

// Réinitialisation du mot de passe
const resetPassword = async (req, res) => {
    const schema = Joi.object({
        token: Joi.string().required(),
        mot_de_passe: Joi.string().min(8).required(),
        confirm_mot_de_passe: Joi.string().valid(Joi.ref('mot_de_passe')).required()
            .messages({
                'any.only': 'La confirmation du mot de passe ne correspond pas'
            })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        const { token, mot_de_passe } = req.body;

        // Consommer le token (le supprimer après vérification)
        const tokenConsumption = await consumeResetToken(token);
        if (!tokenConsumption.valid) {
            return res.status(400).json({ 
                message: "Token invalide ou expiré" 
            });
        }

        const email = tokenConsumption.email;

        // Trouver l'utilisateur
        const utilisateur = await Utilisateur.findOne({ where: { email } });
        if (!utilisateur) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        // Hasher le nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

        // Mettre à jour le mot de passe
        await utilisateur.update({
            mot_de_passe_hash: hashedPassword
        });

        console.log(`[Auth] Mot de passe réinitialisé pour: ${email}`);

        return res.status(200).json({
            message: "Mot de passe réinitialisé avec succès"
        });

    } catch (error) {
        console.error('[Auth] Erreur reset password:', error);
        return res.status(500).json({
            message: "Erreur lors de la réinitialisation du mot de passe"
        });
    }
};

module.exports = { 
    requestEmailVerification, 
    verifyAndRegister, 
    login, 
    requestPasswordReset, 
    verifyPasswordResetToken, 
    resetPassword,
};
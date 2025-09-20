const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../.env' }); 

console.log("HOST utilisé:", process.env.SMTP_HOST);

async function testEmail() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        // Test de connexion
        await transporter.verify();
        console.log('Configuration SMTP valide');

        // Envoi d'un email de test
        const result = await transporter.sendMail({
            from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: 'Test Configuration SMTP',
            html: `
                <h2>Test réussi !</h2>
                <p>La configuration SMTP fonctionne correctement.</p>
                <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
            `
        });

        console.log('Email de test envoyé:', result.messageId);

    } catch (error) {
        console.error('Erreur SMTP:', error.message);
        
        if (error.message.includes('Invalid login')) {
            console.error('Vérifiez :');
            console.error('   - Votre email Gmail dans SMTP_USER');
            console.error('   - Le mot de passe d\'application dans SMTP_PASS');
            console.error('   - Que l\'authentification 2FA est activée');
        }
    }
}

testEmail();
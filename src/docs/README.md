# Transport API

API pour système de transport avec gestion des tickets, paiements Wave, validation QR codes et suivi GPS temps réel.

## Fonctionnalités

### Authentification
- Inscription avec vérification email (code à 6 chiffres)
- Connexion JWT sécurisée
- Récupération de mot de passe par email
- Rate limiting anti-bruteforce

### Gestion des tickets
- Création de tickets avec QR codes chiffrés (AES-256)
- Expiration automatique (15 minutes)
- Validation atomique via Redis
- Visualisation QR (PNG)
- Job de nettoyage automatique

### Paiements Wave
- Intégration Wave API (payouts)
- Validation automatique des tickets après paiement
- Webhook sécurisé avec vérification HMAC
- Gestion d'idempotence
- Support multi-devises (XOF, EUR, USD)

### Suivi GPS
- Position temps réel des véhicules
- WebSockets pour mises à jour live
- Historique des trajets
- Géolocalisation des arrêts

### Temps réel
- WebSockets pour notifications
- Events : création tickets, paiements, GPS
- Souscription par utilisateur
- Dashboard temps réel

## Technologies

- **Backend**: Node.js, Express.js
- **Base de données**: PostgreSQL avec Sequelize ORM
- **Cache**: Redis (sessions, QR metadata, jobs)
- **Authentification**: JWT, bcrypt
- **Chiffrement**: AES-256-GCM (crypto natif)
- **Email**: Nodemailer (SMTP)
- **Paiements**: Wave API
- **WebSockets**: Socket.IO
- **Validation**: Joi
- **Jobs**: node-cron
- **Documentation**: OpenAPI/Swagger

## Installation

### Prérequis
- Node.js >= 16.x
- PostgreSQL >= 13
- Redis >= 6
- Compte Wave Business (pour paiements)

### Étapes

1. **Copier et décompresser le projet au format zip**

2. **Installer les dépendances**
 npm install

3. **Configuration base de données**
CREATE DATABASE transport_api;

4. **Lancer les services**

# PostgreSQL (si pas en service)
sudo systemctl start postgresql

# Redis 
- Avec linux ou wsl sur windows
sudo systemctl start redis-server
- Avec docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

5. **Adapter les ariables d'environnement**
.env

6. **Migrations base de données**

npm run db:migrate

7. **Démarrer l'API**

# Développement
npm run dev

# Production
npm start

## Configuration

### Fichier .env

### Configuration Gmail

1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application :
   - Google Account → Sécurité → Mots de passe d'application
   - Sélectionner "Autre" → "Nom de l'App"
   - Utiliser le mot de passe généré dans `SMTP_PASS` de `.env`

### Configuration Wave

1. Créer un compte Wave Business
2. Obtenir la clé API dans le dashboard
3. Configurer le webhook : `https://domainename.com/api/paiements/webhook/wave`

## Points d’entrée principaux :
-POST /api/auth/register/requestVerification → Demander code d’inscription
-POST /api/auth/login → Connexion
-POST /api/tickets/create → Créer un ticket
-POST /api/paiements → Effectuer un paiement via Wave
-POST /api/positions → Envoyer position GPS
-GET /api/dashboard → Statistiques en temps réel
-GET /api/profil/me → Consulter son profil

## Usage

### Inscription avec vérification email

# 1. Demander la vérification
POST /api/auth/register/requestVerification
{
  "nom": "John Doe",
  "email": "john@example.com",
  "telephone": "0123456789",
  "mot_de_passe": "motdepasse123"
}

# 2. Vérifier le code reçu par email
POST /api/auth/register/verify
{
  "email": "john@example.com",
  "code": "123456"
}


### Connexion

POST /api/auth/login
{
  "email": "john@example.com",
  "mot_de_passe": "motdepasse123"
}


### Créer et payer un ticket

# 1. Créer ticket avec QR
POST /api/tickets/create
Authorization: Bearer <jwt-token>
{
  "trajet_id": 1
}

# 2. Payer et valider automatiquement
POST /api/paiements
Authorization: Bearer <jwt-token>
{
  "ticket_id": 123,
  "montant": 1500,
  "mobile": "+221701234567",
  "token": "<qr-token>"
}

### Visualiser le QR Code
GET /api/tickets/1

## API Documentation

La documentation complète est disponible via Swagger :


# Démarrer l'API puis visiter :
http://localhost:3000/api-docs

# Ou consulter le fichier
docs/api.yaml

### Flux de données

1. **Authentification** : JWT → Middleware → Contrôleur
2. **Tickets** : Création → QR chiffré → Redis → WebSocket
3. **Paiements** : Wave API → Validation QR → DB → WebSocket
4. **GPS** : Position → Redis → WebSocket broadcast

## Sécurité

### Mesures implémentées

- **Chiffrement** : AES-256-GCM pour QR codes
- **Hashing** : bcrypt pour mots de passe
- **JWT** : Tokens sécurisés avec expiration
- **Rate Limiting** : Protection anti-bruteforce
- **CORS** : Contrôle accès cross-origin
- **Validation** : Joi pour tous inputs
- **Webhook** : HMAC SHA256 pour Wave

### Variables sensibles
- Toutes les clés dans `.env` (jamais committées)
- JWT secrets rotationnés régulièrement
- Mots de passe d'application Gmail
- Secrets webhook Wave

## Tests

# Test email
node test-email.js

### Tests manuels avec Insomnia

1. Configurer l'environment avec `base_url` et `jwt_token`
2. Tester les flows complets

### Performance

### Métriques cibles

- **Latence API** : < 200ms (p95)
- **Throughput** : > 1000 req/s
- **Uptime** : > 99.9%
- **WebSocket** : < 50ms latence

### Optimisations

- **Redis caching** : Métadonnées QR et sessions
- **Database indexing** : Colonnes fréquemment requêtées
- **Connection pooling** : PostgreSQL et Redis
- **Compression** : gzip responses
- **Rate limiting** : Protection DDoS

## Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## Remerciements

- [Wave](https://wave.com) pour l'API de paiement
- [Redis](https://redis.io) pour le cache haute performance
- [PostgreSQL](https://postgresql.org) pour la base de données robuste
- [Socket.IO](https://socket.io) pour les WebSockets
- [Express.js](https://expressjs.com) pour le framework web

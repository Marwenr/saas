# SaaS Starter Monorepo - Système de Gestion de Stock et Point de Vente

Un système SaaS complet de gestion de stock, achats, ventes et point de vente (POS) pour les entreprises, construit avec JavaScript en utilisant pnpm workspaces.

## 📋 Table des Matières

- [Introduction](#introduction)
- [Architecture du Projet](#architecture-du-projet)
- [Structure du Projet](#structure-du-projet)
- [Stack Technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation et Lancement avec pnpm](#installation-et-lancement-avec-pnpm)
- [Installation et Lancement avec Docker](#installation-et-lancement-avec-docker)
- [Fonctionnalités](#fonctionnalités)
- [API Endpoints](#api-endpoints)
- [Pricing HYBRID Mode](#product-pricing---hybrid-mode)
- [Configuration](#configuration)
- [Scripts](#scripts-reference)
- [Développement](#développement)

---

## 🎯 Introduction

Ce projet est une application SaaS complète de gestion d'entreprise incluant :

- **Gestion Multi-Entreprises** : Support multi-tenant avec isolation des données par entreprise
- **Gestion de Produits** : Catalogue de produits avec références, OEM, marques, catégories
- **Gestion de Stock** : Suivi des mouvements de stock, ajustements, inventaire
- **Gestion des Achats** : Commandes d'achat, réception, suivi des fournisseurs
- **Point de Vente (POS)** : Interface de vente avec panier, recherche de produits
- **Gestion des Ventes** : Historique des ventes, facturation
- **Analytiques** : Tableaux de bord, rapports de ventes, analyses fournisseurs
- **Pricing Automatique** : Calcul automatique des prix de vente avec mode HYBRID

L'application est conçue pour être scalable, maintenable et prête pour la production.

---

## 🏗️ Architecture du Projet

### Architecture Globale

Le projet suit une architecture **monorepo** avec séparation claire des responsabilités :

```
┌─────────────────────────────────────────────────────────────┐
│                      Monorepo Root                          │
│  (pnpm workspaces, configuration partagée, scripts)        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Backend    │    │   Shared     │
│   (Next.js)  │◄───┤  (Fastify)   │───►│  (Utils)     │
│              │    │              │    │              │
│  Port: 3000  │    │  Port: 4000  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │
        │                   ▼
        │           ┌──────────────┐
        │           │   MongoDB    │
        │           │  Port: 27017 │
        │           └──────────────┘
        │
        └─────────── Communication HTTP/REST ───────────┘
```

### Flux de Données

1. **Frontend (Next.js)** : Interface utilisateur React avec App Router
2. **Backend (Fastify)** : API REST avec authentification JWT
3. **MongoDB** : Base de données NoSQL pour stockage des données
4. **Shared** : Utilitaires et constantes partagées entre frontend et backend

### Architecture Backend

```
Backend/
├── src/
│   ├── index.js              # Point d'entrée du serveur
│   ├── server.js             # Configuration Fastify
│   ├── controllers/          # Logique métier
│   │   ├── authController.js
│   │   ├── companyController.js
│   │   ├── productController.js
│   │   ├── inventoryController.js
│   │   ├── posController.js
│   │   ├── purchaseController.js
│   │   ├── supplierController.js
│   │   └── reportsController.js
│   ├── models/               # Modèles Mongoose
│   │   ├── User.js
│   │   ├── company.model.js
│   │   ├── product.model.js
│   │   ├── purchaseOrder.model.js
│   │   ├── sale.model.js
│   │   ├── stockMovement.model.js
│   │   └── supplier.model.js
│   ├── routes/               # Définition des routes
│   │   ├── authRoutes.js
│   │   ├── companyRoutes.js
│   │   ├── productRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── posRoutes.js
│   │   ├── purchaseRoutes.js
│   │   ├── supplierRoutes.js
│   │   └── reportRoutes.js
│   └── utils/                # Utilitaires
│       ├── auth.js           # Middleware d'authentification
│       ├── db.js             # Connexion MongoDB
│       ├── company.js        # Utilitaires entreprise
│       └── pricing.js        # Calcul des prix
```

### Architecture Frontend

```
Frontend/
├── app/                      # Next.js App Router
│   ├── layout.js            # Layout racine
│   ├── page.js              # Page d'accueil (Dashboard)
│   ├── login/               # Authentification
│   ├── register/            # Inscription
│   ├── register-company/    # Création d'entreprise
│   ├── dashboard/           # Tableau de bord
│   ├── products/            # Gestion produits
│   │   ├── page.js          # Liste produits
│   │   └── [id]/            # Détails produit
│   ├── inventory/           # Gestion stock
│   ├── purchases/           # Gestion achats
│   │   ├── page.js          # Liste commandes
│   │   ├── new/             # Nouvelle commande
│   │   └── [id]/            # Détails commande
│   ├── sales/               # Historique ventes
│   ├── suppliers/           # Gestion fournisseurs
│   ├── pos/                 # Point de vente
│   └── analytics/           # Analytiques
│       ├── sales/           # Rapports ventes
│       └── suppliers/       # Rapports fournisseurs
├── components/              # Composants React réutilisables
│   ├── AuthGuard.js         # Protection des routes
│   ├── Navbar.js            # Barre de navigation
│   ├── Sidebar.js           # Menu latéral
│   ├── Container.js         # Conteneur de contenu
│   ├── Providers.js         # Context providers
│   ├── ProductForm.js       # Formulaire produit
│   ├── SupplierForm.js      # Formulaire fournisseur
│   ├── StockAdjustmentForm.js
│   └── charts/              # Composants graphiques
│       ├── KPICard.js
│       ├── SalesChart.js
│       └── TopProductsChart.js
└── lib/                     # Bibliothèques et utilitaires
    ├── api.js               # Client API
    ├── useAuth.js           # Hook d'authentification
    ├── products.js          # Fonctions produits
    ├── purchases.js         # Fonctions achats
    ├── inventory.js         # Fonctions stock
    ├── pos.js               # Fonctions POS
    ├── suppliers.js         # Fonctions fournisseurs
    ├── reports.js           # Fonctions rapports
    └── dateUtils.js         # Utilitaires dates
```

---

## 📁 Structure du Projet

### Structure Globale

```
saas/
├── frontend/                 # Application Next.js (App Router)
│   ├── app/                 # Pages et layouts Next.js
│   ├── components/          # Composants React réutilisables
│   ├── lib/                 # Bibliothèques et utilitaires frontend
│   ├── package.json
│   ├── next.config.js       # Configuration Next.js
│   ├── tailwind.config.cjs  # Configuration Tailwind CSS
│   ├── postcss.config.cjs   # Configuration PostCSS
│   └── .env.example         # Variables d'environnement exemple
│
├── backend/                 # Serveur Fastify avec MongoDB
│   ├── src/                 # Code source backend
│   │   ├── index.js         # Point d'entrée
│   │   ├── server.js        # Configuration serveur
│   │   ├── controllers/     # Contrôleurs (logique métier)
│   │   ├── models/          # Modèles Mongoose
│   │   ├── routes/          # Définition des routes
│   │   └── utils/           # Utilitaires backend
│   ├── test/                # Tests unitaires et d'intégration
│   │   ├── helpers/         # Helpers de test
│   │   ├── *.test.js        # Fichiers de test
│   │   ├── setup.js         # Configuration tests
│   │   ├── globalSetup.js   # Setup global
│   │   └── globalTeardown.js
│   ├── package.json
│   ├── vitest.config.mjs    # Configuration Vitest
│   └── .env.example         # Variables d'environnement exemple
│
├── shared/                  # Utilitaires et constantes partagées
│   ├── index.js             # Exports partagés
│   ├── api.js               # Constantes API
│   ├── constants.js         # Constantes globales
│   ├── validators.js        # Validateurs partagés
│   └── package.json
│
├── docker/                  # Configuration Docker (alternative)
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── .husky/                  # Git hooks
│   └── pre-commit           # Hook pre-commit
│
├── package.json             # Package.json racine avec config workspace
├── pnpm-workspace.yaml      # Configuration pnpm workspaces
├── pnpm-lock.yaml           # Lock file pnpm
├── docker-compose.yml       # Docker Compose principal
├── Dockerfile.backend       # Dockerfile backend
├── Dockerfile.frontend      # Dockerfile frontend
├── eslint.config.js         # Configuration ESLint
├── .prettierrc              # Configuration Prettier
├── .editorconfig            # Configuration éditeur
├── README.md                # Ce fichier
├── QUICK_START.md           # Guide de démarrage rapide
└── DOCKER_COMMANDS.md       # Commandes Docker détaillées
```

### Structure Backend Détaillée

```
backend/src/
├── index.js                 # Point d'entrée - démarrage serveur
├── server.js                # Configuration Fastify, plugins, routes
│
├── controllers/             # Logique métier
│   ├── authController.js    # Authentification (login, register, logout)
│   ├── companyController.js # Gestion entreprises (création, mise à jour)
│   ├── productController.js # CRUD produits, recherche
│   ├── inventoryController.js # Gestion stock, ajustements
│   ├── posController.js     # Point de vente (ventes, panier)
│   ├── purchaseController.js # Commandes d'achat, réception
│   ├── purchaseReceiveHelper.js # Helper réception commandes
│   ├── supplierController.js # CRUD fournisseurs
│   └── reportsController.js # Rapports et analytiques
│
├── models/                  # Schémas Mongoose
│   ├── User.js              # Utilisateur (email, password, companyId)
│   ├── company.model.js     # Entreprise (name, email, taxId, etc.)
│   ├── product.model.js     # Produit (sku, name, prices, stock, etc.)
│   ├── purchaseOrder.model.js # Commande achat (supplier, items, status)
│   ├── sale.model.js        # Vente (items, total, date)
│   ├── stockMovement.model.js # Mouvement stock (type, quantity, reason)
│   └── supplier.model.js    # Fournisseur (name, contact, etc.)
│
├── routes/                  # Définition des routes API
│   ├── authRoutes.js        # POST /api/auth/login, /register, etc.
│   ├── companyRoutes.js     # POST /api/company/register, GET /api/company
│   ├── productRoutes.js     # CRUD /api/products
│   ├── inventoryRoutes.js   # GET/POST /api/inventory/*
│   ├── posRoutes.js         # POST /api/pos/sell, GET /api/pos/search
│   ├── purchaseRoutes.js    # CRUD /api/purchases, POST /api/purchases/:id/receive
│   ├── supplierRoutes.js    # CRUD /api/suppliers
│   └── reportRoutes.js      # GET /api/reports/*
│
└── utils/                   # Utilitaires
    ├── auth.js              # Middleware authenticateUser, verifyCompany
    ├── db.js                # connectDB() - connexion MongoDB
    ├── company.js           # Utilitaires entreprise
    └── pricing.js           # calculateSalePrice() - calcul prix HYBRID
```

### Structure Frontend Détaillée

```
frontend/
├── app/                     # Next.js App Router (pages)
│   ├── layout.js            # Layout racine (Navbar + Sidebar + Container)
│   ├── globals.css          # Styles globaux Tailwind
│   ├── page.js              # Page d'accueil (Dashboard)
│   │
│   ├── login/               # Authentification
│   │   └── page.js          # Page de connexion
│   ├── register/            # Inscription utilisateur
│   │   └── page.js
│   ├── register-company/    # Création entreprise
│   │   └── page.js
│   │
│   ├── dashboard/           # Tableau de bord principal
│   │   └── page.js          # Vue d'ensemble avec KPIs
│   │
│   ├── products/            # Gestion produits
│   │   ├── page.js          # Liste produits (tableau avec recherche)
│   │   └── [id]/            # Détails/édition produit
│   │       └── page.js
│   │
│   ├── inventory/           # Gestion stock
│   │   └── page.js          # Liste stock, ajustements
│   │
│   ├── purchases/           # Gestion achats
│   │   ├── page.js          # Liste commandes d'achat
│   │   ├── new/             # Création nouvelle commande
│   │   │   └── page.js
│   │   └── [id]/            # Détails/réception commande
│   │       └── page.js
│   │
│   ├── sales/               # Historique ventes
│   │   └── page.js          # Liste des ventes
│   │
│   ├── suppliers/           # Gestion fournisseurs
│   │   └── page.js          # Liste fournisseurs, CRUD
│   │
│   ├── pos/                 # Point de vente
│   │   └── page.js          # Interface POS avec recherche et panier
│   │
│   └── analytics/           # Analytiques et rapports
│       ├── page.js          # Vue d'ensemble analytiques
│       ├── sales/           # Rapports ventes
│       │   └── page.js
│       └── suppliers/       # Rapports fournisseurs
│           └── page.js
│
├── components/              # Composants React réutilisables
│   ├── AuthGuard.js         # HOC protection routes (vérifie auth)
│   ├── Navbar.js            # Barre de navigation supérieure
│   ├── Sidebar.js           # Menu latéral avec navigation
│   ├── Container.js         # Conteneur de contenu avec padding
│   ├── Providers.js         # Context providers (Auth, Theme)
│   │
│   ├── ProductForm.js       # Formulaire création/édition produit
│   ├── NewProductModal.js   # Modal création produit
│   ├── SupplierForm.js      # Formulaire fournisseur
│   ├── StockAdjustmentForm.js # Formulaire ajustement stock
│   │
│   └── charts/              # Composants graphiques (Recharts)
│       ├── KPICard.js       # Carte KPI (valeur + label)
│       ├── SalesChart.js    # Graphique ventes
│       └── TopProductsChart.js # Graphique top produits
│
└── lib/                     # Bibliothèques et utilitaires
    ├── api.js               # Client API (fetch avec gestion erreurs)
    ├── useAuth.js           # Hook React pour authentification
    ├── products.js          # Fonctions produits (fetch, create, update)
    ├── purchases.js         # Fonctions achats
    ├── inventory.js         # Fonctions stock
    ├── pos.js               # Fonctions POS (search, sell)
    ├── suppliers.js         # Fonctions fournisseurs
    ├── reports.js           # Fonctions rapports
    └── dateUtils.js         # Utilitaires formatage dates
```

---

## 🛠️ Stack Technique

### Technologies Principales

- **Monorepo** : pnpm workspaces (gestion multi-packages)
- **Frontend** :
  - Next.js 14 (App Router)
  - React 18
  - Tailwind CSS (styling)
  - Recharts (graphiques)
- **Backend** :
  - Fastify (framework web rapide)
  - Node.js 18+
  - MongoDB (base de données)
  - Mongoose (ODM MongoDB)
  - JWT (authentification)
  - bcryptjs (hashage mots de passe)
- **Language** : JavaScript (ES Modules)
- **Base de données** : MongoDB 7
- **Containerisation** : Docker + Docker Compose

### Outils de Développement

- **Linting** : ESLint (Next.js + Node.js configs)
- **Formatting** : Prettier
- **Git Hooks** : Husky + lint-staged
- **Testing** : Vitest (backend)
- **Package Manager** : pnpm 8+

---

## 📦 Prérequis

### Pour le développement avec pnpm

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **MongoDB** (local ou via Docker)

### Pour le développement avec Docker

- **Docker** >= 20.10
- **Docker Compose** >= 2.0

### Installation des prérequis

#### Node.js et pnpm

```bash
# Installer Node.js (via nvm recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Installer pnpm
npm install -g pnpm@8.15.0

# Vérifier les versions
node --version  # >= 18.0.0
pnpm --version  # >= 8.0.0
```

#### Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Ou via Snap (Ubuntu)
sudo snap install docker

# Vérifier l'installation
docker --version
docker-compose --version
```

---

## 🚀 Installation et Lancement avec pnpm

### 1. Cloner le Projet

```bash
git clone <repository-url>
cd saas
```

### 2. Installer les Dépendances

```bash
# Installer toutes les dépendances (root, frontend, backend, shared)
pnpm install
```

Cette commande installe automatiquement les dépendances pour tous les workspaces.

### 3. Configuration des Variables d'Environnement

#### Backend

```bash
# Copier le fichier exemple
cp backend/.env.example backend/.env

# Éditer backend/.env
nano backend/.env
```

Variables requises pour le backend :

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/saas-starter

# Serveur
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production

# CORS
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

#### Frontend

```bash
# Copier le fichier exemple
cp frontend/.env.example frontend/.env.local

# Éditer frontend/.env.local
nano frontend/.env.local
```

Variables requises pour le frontend :

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Démarrer MongoDB

#### Option A : MongoDB Local

```bash
# Démarrer MongoDB (selon votre installation)
sudo systemctl start mongod
# ou
mongod --dbpath /path/to/data
```

#### Option B : MongoDB via Docker

```bash
# Démarrer MongoDB seul
docker run -d \
  --name saas-mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7
```

### 5. Démarrer l'Application

#### Démarrer tous les services (recommandé)

```bash
# Depuis la racine du projet
pnpm dev
```

Cette commande démarre :

- Frontend sur `http://localhost:3000`
- Backend sur `http://localhost:4000`

#### Démarrer les services individuellement

```bash
# Terminal 1 - Backend
cd backend
pnpm dev

# Terminal 2 - Frontend
cd frontend
pnpm dev
```

### 6. Vérifier le Démarrage

- **Frontend** : Ouvrir `http://localhost:3000`
- **Backend Health Check** : `curl http://localhost:4000/health`
- **Backend API** : `curl http://localhost:4000/api/auth/login`

### 7. Premier Utilisateur

1. Accéder à `http://localhost:3000/register-company`
2. Créer une entreprise
3. Créer un compte utilisateur
4. Se connecter

---

## 🐳 Installation et Lancement avec Docker

### 1. Cloner le Projet

```bash
git clone <repository-url>
cd saas
```

### 2. Configuration des Variables d'Environnement

Créer un fichier `.env` à la racine (optionnel, les valeurs par défaut fonctionnent) :

```env
# JWT Secrets (IMPORTANT: changer en production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production

# MongoDB
MONGODB_URI=mongodb://mongodb:27017/saas-starter

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Permissions Docker

#### Si Docker est installé via Snap (Ubuntu/Debian)

```bash
# Utiliser sudo avec toutes les commandes Docker
sudo docker ps
sudo docker-compose up -d
```

#### Si Docker est installé via apt/yum

```bash
# Ajouter l'utilisateur au groupe docker (une seule fois)
sudo usermod -aG docker $USER
newgrp docker  # Ou déconnecter/reconnecter

# Vérifier (sans sudo)
docker ps
```

### 4. Démarrer avec Docker Compose

#### Option A : Docker Compose à la racine (recommandé)

```bash
# Démarrer tous les services en arrière-plan
sudo docker-compose up -d

# Ou sans sudo si vous êtes dans le groupe docker
docker-compose up -d
```

Cette commande démarre :

- **MongoDB** sur le port `27017`
- **Backend** sur le port `4000`
- **Frontend** sur le port `3000`

#### Option B : Docker Compose dans le dossier docker/

```bash
cd docker
sudo docker-compose up -d
```

### 5. Vérifier le Statut

```bash
# Voir les conteneurs en cours d'exécution
sudo docker-compose ps

# Voir les logs
sudo docker-compose logs -f

# Logs d'un service spécifique
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
sudo docker-compose logs -f mongodb
```

### 6. Accéder à l'Application

- **Frontend** : `http://localhost:3000`
- **Backend API** : `http://localhost:4000`
- **Health Check** : `http://localhost:4000/health`

### 7. Arrêter les Services

```bash
# Arrêter les conteneurs (conserve les données)
sudo docker-compose down

# Arrêter et supprimer les volumes (supprime les données MongoDB)
sudo docker-compose down -v
```

### 8. Reconstruire les Images

Si vous modifiez le code :

```bash
# Reconstruire et redémarrer
sudo docker-compose up -d --build

# Reconstruire sans cache
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

### 9. Commandes Docker Utiles

```bash
# Voir les logs en temps réel
sudo docker-compose logs -f

# Redémarrer un service
sudo docker-compose restart backend

# Exécuter une commande dans un conteneur
sudo docker-compose exec backend sh
sudo docker-compose exec mongodb mongosh

# Nettoyer les conteneurs arrêtés
sudo docker-compose down
sudo docker system prune -f

# Nettoyer complètement (images, volumes, réseaux)
sudo docker-compose down -v
sudo docker system prune -a --volumes
```

### 10. Pour le Développement Local avec MongoDB Docker

Si vous voulez utiliser MongoDB via Docker mais développer le frontend/backend localement :

```bash
# Démarrer seulement MongoDB
sudo docker run -d \
  --name saas-mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7

# Arrêter MongoDB
sudo docker stop saas-mongodb
sudo docker rm saas-mongodb

# Ou utiliser docker-compose pour MongoDB seul
sudo docker-compose up -d mongodb
```

Puis dans `backend/.env`, utiliser :

```env
MONGODB_URI=mongodb://localhost:27017/saas-starter
```

---

## ✨ Fonctionnalités

### 🔐 Authentification et Gestion Multi-Entreprises

- **Inscription utilisateur** : Création de compte avec email et mot de passe
- **Création d'entreprise** : Enregistrement d'une nouvelle entreprise
- **Connexion/Déconnexion** : Authentification JWT avec cookies
- **Isolation des données** : Toutes les données sont isolées par entreprise (`companyId`)

### 📦 Gestion de Produits

- **Catalogue de produits** : SKU, nom, description, marque, catégorie
- **Références** : Référence fabricant, références OEM multiples
- **Gestion des prix** :
  - Prix d'achat moyen (moyenne pondérée)
  - Dernier prix d'achat
  - Prix de vente TTC (calculé automatiquement)
  - Mode HYBRID de calcul de prix
- **Gestion du stock** : Quantité en stock, seuil d'alerte
- **Informations fournisseurs** : Prix et quantités par fournisseur

### 📊 Gestion de Stock

- **Mouvements de stock** : Historique de tous les mouvements (entrée, sortie, ajustement)
- **Ajustements de stock** : Correction manuelle des quantités
- **Inventaire** : Vue d'ensemble du stock avec alertes
- **Suivi des réceptions** : Enregistrement automatique lors de la réception de commandes

### 🛒 Gestion des Achats

- **Commandes d'achat** : Création de commandes avec produits et quantités
- **Réception de commandes** : Réception totale ou partielle
- **Mise à jour automatique** :
  - Stock mis à jour
  - Prix d'achat moyen recalculé
  - Prix de vente recalculé (mode HYBRID)
- **Statut des commandes** : En attente, partiellement reçue, complète
- **Historique** : Suivi de toutes les commandes et réceptions

### 👥 Gestion des Fournisseurs

- **CRUD fournisseurs** : Création, lecture, mise à jour, suppression
- **Informations de contact** : Nom, email, téléphone, adresse
- **Historique d'achats** : Suivi des achats par fournisseur
- **Prix par fournisseur** : Dernier prix et moyenne par fournisseur

### 💰 Point de Vente (POS)

- **Recherche de produits** : Recherche par SKU, nom, référence OEM
- **Panier** : Ajout/suppression de produits, modification des quantités
- **Calcul automatique** : Total HT, TVA, Total TTC
- **Enregistrement des ventes** : Sauvegarde des ventes avec historique
- **Mise à jour du stock** : Déduction automatique du stock lors de la vente

### 📈 Analytiques et Rapports

- **Tableau de bord** : KPIs (ventes, produits, stock)
- **Rapports de ventes** : Graphiques de ventes par période
- **Top produits** : Produits les plus vendus
- **Rapports fournisseurs** : Analyse des achats par fournisseur
- **Historique des ventes** : Liste complète des ventes avec détails

---

## 🔌 API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription utilisateur
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Informations utilisateur actuel

### Entreprise

- `POST /api/company/register` - Créer une entreprise
- `GET /api/company` - Obtenir les informations de l'entreprise

### Produits

- `GET /api/products` - Liste des produits (avec pagination, recherche)
- `GET /api/products/:id` - Détails d'un produit
- `POST /api/products` - Créer un produit
- `PUT /api/products/:id` - Mettre à jour un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Stock

- `GET /api/inventory` - Liste du stock
- `GET /api/inventory/movements` - Historique des mouvements
- `POST /api/inventory/adjust` - Ajuster le stock

### Achats

- `GET /api/purchases` - Liste des commandes d'achat
- `GET /api/purchases/:id` - Détails d'une commande
- `POST /api/purchases` - Créer une commande d'achat
- `PUT /api/purchases/:id` - Mettre à jour une commande
- `POST /api/purchases/:id/receive` - Réceptionner une commande

### Fournisseurs

- `GET /api/suppliers` - Liste des fournisseurs
- `GET /api/suppliers/:id` - Détails d'un fournisseur
- `POST /api/suppliers` - Créer un fournisseur
- `PUT /api/suppliers/:id` - Mettre à jour un fournisseur
- `DELETE /api/suppliers/:id` - Supprimer un fournisseur

### Point de Vente

- `GET /api/pos/search?q=...` - Rechercher des produits
- `POST /api/pos/sell` - Enregistrer une vente

### Rapports

- `GET /api/reports/dashboard` - Données du tableau de bord
- `GET /api/reports/sales` - Rapports de ventes
- `GET /api/reports/suppliers` - Rapports fournisseurs

### Health Check

- `GET /health` - Vérification de l'état du serveur

---

## 💵 Product Pricing - HYBRID Mode

Le système utilise un **mode de pricing HYBRID** pour calculer automatiquement les prix de vente recommandés lorsque les commandes d'achat sont réceptionnées.

### Comment ça fonctionne

Lorsqu'une commande d'achat est réceptionnée et que le stock est mis à jour, le système calcule un prix de vente recommandé en utilisant la formule suivante :

1. **Coût Moyen** (`avgCost`) : Coût d'achat moyen pondéré sur toutes les couches de stock
2. **Dernier Coût** (`lastCost`) : Dernier coût unitaire d'achat de la dernière réception
3. **Marge Cible** (`targetMargin`) : Marge cible du produit (par défaut : 20%)
4. **Marge Minimale sur Dernier** (`minMarginOnLast`) : Marge minimale garantie sur le dernier coût d'achat (par défaut : 10%, fixe et ne peut pas être modifiée)
5. **Taux de Taxe** (`taxRate`) : Taux de taxe appliqué au prix final (par défaut : 19%)

### Formule de Calcul

Le prix de vente recommandé (TTC - toutes taxes comprises) est calculé en 4 étapes :

```
Étape 1: priceTarget = avgCost × (1 + targetMargin / 100)
         (Prix HT avec marge cible/gain)

Étape 2: priceMinSafe = lastCost × (1 + minMarginOnLast / 100)
         (Prix HT avec marge de protection minimale)

Étape 3: priceHT = max(priceTarget, priceMinSafe)
         (Meilleur prix HT pour éviter les pertes et maintenir le profit)

Étape 4: priceTTC = priceHT × (1 + taxRate / 100)
         (Prix final incluant la taxe)
```

Cela garantit que :

- La marge cible (gain) est appliquée au coût moyen
- Une marge minimale est toujours garantie sur le dernier coût d'achat (protection, pas un gain)
- Le prix recommandé est le plus élevé des deux, protégeant la rentabilité
- La taxe est ajoutée indépendamment au prix final

### Champs Produit

- `pricingMode` : Actuellement défini à `'HYBRID'` (par défaut, ne peut pas être modifié)
- `marginRate` : Pourcentage de marge cible (par défaut : 20%, peut être modifié)
- `minMarginOnLastPurchase` : Marge minimale sur le dernier coût (par défaut : 10%, **fixe et désactivée** - ne peut pas être modifiée)
- `taxRate` : Pourcentage de taux de taxe (par défaut : 19%, peut être modifié)
- `purchasePrice` : Coût d'achat moyen pondéré (mis à jour automatiquement)
- `lastPurchasePrice` : Dernier coût unitaire d'achat (mis à jour automatiquement)
- `salePrice` : Prix de vente actuel TTC (recalculé automatiquement lors de la réception d'achat)

### Scénario Complet de Réception de Commande d'Achat

#### Étape 1 : Créer une Commande d'Achat

1. L'utilisateur crée une commande d'achat avec des produits et des quantités
2. Chaque ligne de produit inclut :
   - Référence produit
   - Quantité à acheter
   - Prix unitaire (HT)

#### Étape 2 : Réceptionner la Commande d'Achat

Lorsqu'une commande d'achat est réceptionnée (complète ou partielle) :

1. **Mise à jour du Stock** :
   - La `stockQty` du produit est augmentée de la quantité reçue
   - Un mouvement de stock est enregistré dans la collection `StockMovement`

2. **Mise à jour des Prix** :
   - **Prix d'Achat Moyen** (`purchasePrice`) : Calculé en utilisant la moyenne pondérée
     ```
     newAveragePrice = (oldStockQty × oldAveragePrice + receivedQty × newUnitPrice) / (oldStockQty + receivedQty)
     ```
   - **Dernier Prix d'Achat** (`lastPurchasePrice`) : Mis à jour avec le nouveau prix unitaire de cette réception

3. **Calcul Automatique du Prix de Vente** (Mode HYBRID) :
   - Le système calcule automatiquement le nouveau `salePrice` en utilisant la formule HYBRID
   - Le calcul utilise :
     - `purchasePrice` mis à jour (coût moyen)
     - `lastPurchasePrice` mis à jour (dernier coût)
     - `marginRate` du produit (marge cible)
     - `minMarginOnLastPurchase` du produit (protection minimale)
     - `taxRate` du produit (taux de taxe)
   - Le résultat est arrondi à 2 décimales
   - `salePrice` est stocké en TTC (toutes taxes comprises)

4. **Mise à jour des Informations Fournisseur** :
   - Les informations de pricing par fournisseur sont maintenues dans le tableau `supplierInfos`
   - Inclut : dernier prix d'achat, prix d'achat moyen, quantité totale achetée, date du dernier achat

#### Étape 3 : Synchronisation des Prix dans l'Application

Après la réception de la commande d'achat, le `salePrice` mis à jour est automatiquement reflété partout :

1. **Popup de Détails Produit** :
   - Lors de l'édition d'un produit, le `salePrice` mis à jour est affiché
   - Tous les prix affichent 2 décimales (ex. `92.19 TND`)

2. **Tableau du Catalogue Produits** :
   - Le tableau se recharge automatiquement lorsque la page devient visible
   - Les prix mis à jour sont affichés dans la colonne "Prix de vente (TTC)"
   - Les prix formatés avec 2 décimales

3. **POS (Point de Vente)** :
   - Les résultats de recherche sont effacés lorsque la page devient visible (force des données fraîches à la prochaine recherche)
   - Lors de la recherche d'un produit, les prix mis à jour sont récupérés
   - Si un produit est déjà dans le panier et recherché à nouveau, son prix dans le panier est automatiquement mis à jour
   - Tous les prix affichés en TTC avec 2 décimales

### Exemple de Scénario

**État Initial :**

- Produit : Plaquette de frein
- Stock actuel : 10 unités
- Prix d'achat moyen : 50.00 TND
- Dernier prix d'achat : 50.00 TND
- Prix de vente actuel : 71.25 TND (TTC)
- Taux de marge : 20%
- Marge minimale sur dernier : 10%
- Taux de taxe : 19%

**Réception de Commande d'Achat :**

- Réception de 20 unités à 60.00 TND par unité

**Après Réception :**

1. **Mise à jour du Stock :**
   - Nouveau stock : 30 unités (10 + 20)

2. **Calculs de Prix :**
   - Nouveau prix moyen : `(10 × 50 + 20 × 60) / 30 = 56.67 TND`
   - Nouveau dernier prix d'achat : `60.00 TND`

3. **Calcul du Prix de Vente (HYBRID) :**

   ```
   Étape 1: priceTarget = 56.67 × (1 + 20/100) = 68.00 TND (HT)
   Étape 2: priceMinSafe = 60.00 × (1 + 10/100) = 66.00 TND (HT)
   Étape 3: priceHT = max(68.00, 66.00) = 68.00 TND
   Étape 4: priceTTC = 68.00 × (1 + 19/100) = 80.92 TND
   ```

   - Nouveau prix de vente : **80.92 TND (TTC)**

4. **Mises à jour Automatiques :**
   - Enregistrement produit mis à jour avec le nouveau `salePrice`
   - Tableau catalogue affiche 80.92 TND
   - Recherche POS affiche 80.92 TND
   - Popup détails produit affiche 80.92 TND

### Format d'Affichage des Prix

Tous les prix dans l'application :

- S'affichent avec **2 décimales** (ex. `92.19`, `100.00`)
- S'affichent en **TTC (Toutes Taxes Comprises)** - incluant la taxe
- Se mettent à jour automatiquement lorsque les commandes d'achat sont réceptionnées
- Sont synchronisés dans toutes les vues (catalogue, POS, détails produit)

### Valeurs par Défaut

- `marginRate` : **20%** (peut être modifié par produit)
- `minMarginOnLastPurchase` : **10%** (fixe, ne peut pas être modifié)
- `taxRate` : **19%** (peut être modifié par produit)
- `pricingMode` : **HYBRID** (fixe, ne peut pas être modifié)

---

## ⚙️ Configuration

### Variables d'Environnement Backend

Fichier : `backend/.env`

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/saas-starter

# Serveur
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# JWT (IMPORTANT: changer en production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production

# CORS
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Variables d'Environnement Frontend

Fichier : `frontend/.env.local`

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Configuration Next.js

Fichier : `frontend/next.config.js`

- Mode standalone activé pour Docker
- Variables d'environnement configurées

### Configuration ESLint

Fichier : `eslint.config.js`

- Règles pour Next.js et Node.js
- Support ES Modules

### Configuration Prettier

Fichier : `.prettierrc`

- Formatage automatique du code
- Règles de style cohérentes

---

## 📜 Scripts Reference

### Scripts Racine

```bash
# Démarrer tous les workspaces en mode développement
pnpm dev

# Linter tous les workspaces
pnpm lint

# Formater tous les fichiers avec Prettier
pnpm format

# Vérifier le formatage sans modifier les fichiers
pnpm format:check

# Exécuter les tests (backend)
pnpm test
```

### Scripts Backend

```bash
cd backend

# Démarrer en mode développement (watch mode)
pnpm dev

# Démarrer en mode production
pnpm start

# Linter le code backend
pnpm lint

# Exécuter les tests
pnpm test
```

### Scripts Frontend

```bash
cd frontend

# Démarrer le serveur de développement Next.js
pnpm dev

# Construire pour la production
pnpm build

# Démarrer le serveur de production
pnpm start

# Linter le code frontend
pnpm lint
```

---

## 🔧 Développement

### Structure des Workspaces

Le projet utilise pnpm workspaces pour gérer plusieurs packages :

- `@saas/frontend` : Application Next.js
- `@saas/backend` : Serveur Fastify
- `@saas/shared` : Utilitaires partagés

### Utilisation du Package Shared

```javascript
// Dans frontend ou backend
import { log, DEFAULT_PORT, API_VERSION } from '@saas/shared';
```

### Git Hooks

Husky est configuré pour exécuter le linting et le formatage avant chaque commit :

- ESLint auto-fix pour les fichiers `.js` et `.jsx`
- Formatage Prettier pour tous les fichiers staged

Les hooks s'exécutent automatiquement lors des commits.

### Tests

Les tests sont configurés avec Vitest pour le backend :

```bash
cd backend
pnpm test
```

### Migration Future vers TypeScript

Cette structure est conçue pour être scalable et peut être migrée vers TypeScript à l'avenir sans restructuration majeure :

- Tous les fichiers de configuration supportent TypeScript
- La structure de dossiers accueille les fichiers `.ts` et `.tsx`
- La configuration workspace est compatible avec les outils TypeScript

---

## 📝 Notes Importantes

### Sécurité

- **IMPORTANT** : Changez les secrets JWT et Cookie en production
- Utilisez des variables d'environnement pour toutes les configurations sensibles
- Ne commitez jamais les fichiers `.env` dans le dépôt

### Performance

- Le backend utilise Fastify pour des performances optimales
- Next.js utilise le mode standalone pour des builds optimisés
- MongoDB utilise des index pour des requêtes rapides

### Production

- Utilisez Docker Compose pour le déploiement en production
- Configurez les health checks pour tous les services
- Utilisez un reverse proxy (nginx) devant les services
- Configurez HTTPS avec des certificats SSL

---

## 📄 License

MIT

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

## 📞 Support

Pour toute question ou problème, veuillez ouvrir une issue sur le dépôt GitHub.

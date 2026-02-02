# Scripts de Test

## Script de génération de données de test

Le script `seedTestData.js` génère automatiquement toutes les données nécessaires pour tester l'application.

### Ce qui est créé:

1. **Une entreprise de test**
   - Nom: Auto Parts Test SA
   - Email: test@autoparts.tn

2. **Un compte utilisateur de test**
   - Email: `test@autoparts.tn`
   - Mot de passe: `test123456`
   - Rôle: Owner

3. **10 marques automobiles**
   - Peugeot, Renault, Citroën, Volkswagen, Toyota, Hyundai, Ford, Opel, Fiat, Mercedes-Benz

4. **Plus de 150 pièces automobiles** avec tous les scénarios possibles:
   - Avec références fabricant et OEM multiples (1-5 références par produit)
   - Réparties dans 10 catégories: Moteur, Freinage, Suspension, Éclairage, Carrosserie, Électricité, Transmission, Direction, Climatisation, Échappement
   - Scénarios de stock variés:
     - Produits en rupture de stock (10%)
     - Produits avec stock faible (< minStock) (20%)
     - Produits avec stock normal (30%)
     - Produits avec stock élevé (30%)
     - Produits inactifs (10%)
   - Différentes marges (15% à 50%)
   - Différents taux de TVA (7%, 13%, 19%)
   - Produits avec/sans fournisseurs associés (30% avec)
   - Descriptions variées (80% avec description détaillée)
   - Tags occasionnels (30% des produits)
   - Notes sur certains produits (20%)
   - Prix variés selon les catégories

5. **3 clients de test**
   - 2 particuliers et 1 professionnel
   - Avec véhicules associés (VIN, modèle, année, etc.)
   - Avec données financières (CustomerFinance)

6. **15 fournisseurs** avec spécialisations variées:
   - Fournisseurs généralistes
   - Spécialistes par catégorie (Moteur, Carrosserie, Électricité, Freinage, etc.)
   - Importateurs et distributeurs
   - Avec coordonnées complètes
   - Actifs et prêts à l'emploi

### Utilisation

Depuis le dossier `backend`, exécutez:

```bash
npm run seed
```

Ou directement:

```bash
node scripts/seedTestData.js
```

### Note importante

⚠️ **Le script supprime automatiquement les anciennes données de test** si elles existent (basé sur l'email de l'entreprise `test@autoparts.tn`). Cela permet de régénérer des données propres à chaque exécution.

### Configuration requise

- MongoDB doit être démarré et accessible
- Les variables d'environnement doivent être configurées (notamment `MONGODB_URI`)
- Toutes les dépendances doivent être installées (`npm install`)

### Après l'exécution

Une fois le script exécuté avec succès, vous pouvez:

1. Vous connecter à l'application avec:
   - **Email**: `test@autoparts.tn`
   - **Mot de passe**: `test123456`

2. Tester toutes les fonctionnalités:
   - Gestion des produits (avec tous les scénarios de stock)
   - Gestion des clients
   - Point de vente (POS)
   - Gestion des achats (avec plusieurs fournisseurs)
   - Inventaire (alertes de stock faible, ruptures)
   - Rapports
   - Recherche par références OEM
   - Gestion des fournisseurs multiples

/**
 * Script de génération de données de test
 *
 * Ce script crée automatiquement:
 * - Une entreprise de test
 * - Un compte utilisateur de test
 * - Des marques automobiles
 * - Des pièces automobiles avec références OEM
 * - Des clients avec véhicules
 * - Des fournisseurs
 *
 * Usage: npm run seed (dans le dossier backend)
 *    ou: node scripts/seedTestData.js
 */

import 'dotenv/config';

import Brand from '../src/models/brand.model.js';
import Company from '../src/models/company.model.js';
import Customer from '../src/models/customer.model.js';
import CustomerFinance from '../src/models/customerFinance.model.js';
import Product from '../src/models/product.model.js';
import Sale from '../src/models/sale.model.js';
import Supplier from '../src/models/supplier.model.js';
import User from '../src/models/User.js';
import { connectDB, disconnectDB } from '../src/utils/db.js';

// Configuration des données de test
const TEST_COMPANY = {
  name: 'Auto Parts Test SA',
  email: 'test@autoparts.tn',
  phone: '+216 71 123 456',
  address: '123 Rue Test, Tunis',
  country: 'TN',
  taxId: '12345678A',
  subscriptionPlan: 'pro',
};

const TEST_USER = {
  email: 'test@autoparts.tn',
  password: '123456',
  name: 'Admin Test',
  role: 'owner',
};

// Marques automobiles
const BRANDS = [
  'Peugeot',
  'Renault',
  'Citroën',
  'Volkswagen',
  'Toyota',
  'Hyundai',
  'Ford',
  'Opel',
  'Fiat',
  'Mercedes-Benz',
];

// Catégories de pièces automobiles avec plus de variétés
const CATEGORIES = [
  {
    name: 'Moteur',
    subCategories: [
      'Filtre à huile',
      'Filtre à air',
      'Bougie',
      'Courroie distribution',
      'Courroie accessoires',
      'Liquide de refroidissement',
      'Pompe à eau',
      'Thermostat',
      'Radiateur',
      'Ventilateur',
      'Huile moteur',
      'Vilebrequin',
    ],
  },
  {
    name: 'Freinage',
    subCategories: [
      'Plaquettes avant',
      'Plaquettes arrière',
      'Disques avant',
      'Disques arrière',
      'Liquide de frein',
      'Étriers',
      'Flexibles de frein',
      'Maîtres-cylindres',
      'Tambours',
      'Mâchoires',
      'Capteur ABS',
    ],
  },
  {
    name: 'Suspension',
    subCategories: [
      'Amortisseur avant',
      'Amortisseur arrière',
      'Ressort hélicoïdal',
      'Roulement de roue',
      'Rotule de direction',
      'Bras de suspension',
      'Biellette',
      'Triangle',
      'Cardan',
      'Joints homocinétiques',
    ],
  },
  {
    name: 'Éclairage',
    subCategories: [
      'Phare avant',
      'Phare arrière',
      'Ampoule H1',
      'Ampoule H4',
      'Ampoule H7',
      'Feu stop',
      'Feu clignotant',
      'Feu de position',
      'Projecteur antibrouillard',
      'Réflecteur',
      "Plaque d'immatriculation",
    ],
  },
  {
    name: 'Carrosserie',
    subCategories: [
      'Rétroviseur extérieur',
      'Rétroviseur intérieur',
      'Pare-chocs avant',
      'Pare-chocs arrière',
      'Aile avant',
      'Aile arrière',
      'Porte avant',
      'Porte arrière',
      'Capot',
      'Coffre',
      'Vitre avant',
      'Vitre arrière',
      'Pare-brise',
      'Essuie-glace',
    ],
  },
  {
    name: 'Électricité',
    subCategories: [
      'Alternateur',
      'Démarreur',
      'Batterie 12V',
      'Batterie 24V',
      'Fusible',
      'Relais',
      "Bobine d'allumage",
      'Bougies préchauffage',
      'Faisceau électrique',
      'Interrupteur',
      'Contacteur',
    ],
  },
  {
    name: 'Transmission',
    subCategories: [
      'Embrayage',
      'Kit embrayage',
      'Volant moteur',
      'Boîte de vitesses',
      'Huile boîte',
      'Joint boîte',
      'Pédale embrayage',
      'Câble embrayage',
    ],
  },
  {
    name: 'Direction',
    subCategories: [
      'Crémaillère',
      'Rotule de direction',
      'Pompe direction assistée',
      'Flexible direction',
      'Volant',
      'Combiné clignotant',
      'Barre anti-roulis',
    ],
  },
  {
    name: 'Climatisation',
    subCategories: [
      'Compresseur clim',
      'Condenseur',
      'Évaporateur',
      'Filtre habitacle',
      'Gaz clim',
      'Détendeur',
      'Ventilateur clim',
      'Radiateur clim',
    ],
  },
  {
    name: 'Échappement',
    subCategories: [
      'Pot catalytique',
      'Silencieux',
      'Ligne échappement',
      'Collecteur',
      'Sonde lambda',
      'FAP (Filtre à particules)',
      'Soupape EGR',
      'Flexible',
    ],
  },
];

// Fournisseurs de test - Liste élargie
const SUPPLIERS = [
  {
    name: 'Fournisseur Auto Parts Pro',
    contactName: 'Ahmed Ben Ali',
    email: 'contact@autopartspro.tn',
    phone: '+216 71 234 567',
    taxNumber: 'F123456789',
    address: '100 Rue Fournisseur, Tunis',
    city: 'Tunis',
    country: 'TN',
  },
  {
    name: 'Distributeur Pièces Auto',
    contactName: 'Fatma Trabelsi',
    email: 'info@piecesauto.tn',
    phone: '+216 71 345 678',
    taxNumber: 'F987654321',
    address: '200 Avenue Distributeur, Sfax',
    city: 'Sfax',
    country: 'TN',
  },
  {
    name: 'Grossiste Automobile',
    contactName: 'Mohamed Jlassi',
    email: 'contact@grossiste-auto.tn',
    phone: '+216 71 456 789',
    taxNumber: 'F456789123',
    address: '300 Boulevard Grossiste, Sousse',
    city: 'Sousse',
    country: 'TN',
  },
  {
    name: 'Pièces Moteur Expert',
    contactName: 'Karim Hammami',
    email: 'ventes@piecesmoteur.tn',
    phone: '+216 71 567 890',
    taxNumber: 'F111222333',
    address: '150 Rue Moteur, Tunis',
    city: 'Tunis',
    country: 'TN',
  },
  {
    name: 'Carrosserie Premium',
    contactName: 'Samia Feki',
    email: 'info@carrosserie-premium.tn',
    phone: '+216 71 678 901',
    taxNumber: 'F222333444',
    address: '250 Avenue Carrosserie, Sfax',
    city: 'Sfax',
    country: 'TN',
  },
  {
    name: 'Électricité Auto Services',
    contactName: 'Youssef Masri',
    email: 'contact@elec-auto.tn',
    phone: '+216 71 789 012',
    taxNumber: 'F333444555',
    address: '350 Boulevard Électricité, Sousse',
    city: 'Sousse',
    country: 'TN',
  },
  {
    name: 'Freinage Express',
    contactName: 'Noura Ben Ammar',
    email: 'commandes@freinage-express.tn',
    phone: '+216 71 890 123',
    taxNumber: 'F444555666',
    address: '450 Rue Freinage, Tunis',
    city: 'Tunis',
    country: 'TN',
  },
  {
    name: 'Suspension Pro',
    contactName: 'Hichem Bouhlel',
    email: 'vente@suspension-pro.tn',
    phone: '+216 71 901 234',
    taxNumber: 'F555666777',
    address: '550 Avenue Suspension, Sfax',
    city: 'Sfax',
    country: 'TN',
  },
  {
    name: 'Éclairage Auto Plus',
    contactName: 'Amira Khelifi',
    email: 'info@eclairage-plus.tn',
    phone: '+216 71 012 345',
    taxNumber: 'F666777888',
    address: '650 Boulevard Éclairage, Sousse',
    city: 'Sousse',
    country: 'TN',
  },
  {
    name: 'Transmission Expert',
    contactName: 'Omar Mansouri',
    email: 'contact@transmission-expert.tn',
    phone: '+216 71 123 456',
    taxNumber: 'F777888999',
    address: '750 Rue Transmission, Tunis',
    city: 'Tunis',
    country: 'TN',
  },
  {
    name: 'Direction & Climatisation',
    contactName: 'Rania Ben Salah',
    email: 'ventes@direction-clim.tn',
    phone: '+216 71 234 567',
    taxNumber: 'F888999000',
    address: '850 Avenue Direction, Sfax',
    city: 'Sfax',
    country: 'TN',
  },
  {
    name: 'Échappement Performance',
    contactName: 'Tarek Baccouche',
    email: 'info@echappement-perf.tn',
    phone: '+216 71 345 678',
    taxNumber: 'F999000111',
    address: '950 Boulevard Échappement, Sousse',
    city: 'Sousse',
    country: 'TN',
  },
  {
    name: 'Importateur Pièces Europe',
    contactName: 'Sonia Mezghani',
    email: 'import@pieces-europe.tn',
    phone: '+216 71 456 789',
    taxNumber: 'F000111222',
    address: '1050 Rue Import, Tunis',
    city: 'Tunis',
    country: 'TN',
  },
  {
    name: 'Pièces Japonaises Premium',
    contactName: 'Mehdi Garbi',
    email: 'contact@pieces-japon.tn',
    phone: '+216 71 567 890',
    taxNumber: 'F111222333',
    address: '1150 Avenue Japon, Sfax',
    city: 'Sfax',
    country: 'TN',
  },
  {
    name: 'Accessoires & Tuning',
    contactName: 'Leila Dhahbi',
    email: 'tuning@accessoires-auto.tn',
    phone: '+216 71 678 901',
    taxNumber: 'F222333444',
    address: '1250 Boulevard Tuning, Sousse',
    city: 'Sousse',
    country: 'TN',
  },
];

// Clients de test
const CUSTOMERS = [
  {
    firstName: 'Sami',
    lastName: 'Bouazizi',
    phones: ['+216 92 111 111', '+216 71 111 111'],
    email: 'sami.bouazizi@email.tn',
    address: '10 Rue Client 1, Tunis',
    city: 'Tunis',
    clientType: 'particulier',
    vehicles: [
      {
        vin: 'VF3XXXXXXXXXXXXXXX',
        brand: 'Peugeot',
        model: '208',
        year: 2020,
        engine: '1.2 PureTech',
        fuelType: 'essence',
        mileage: 45000,
        acquisitionDate: new Date('2020-03-15'),
      },
    ],
  },
  {
    firstName: 'Leila',
    lastName: 'Mahmoudi',
    phones: ['+216 92 222 222'],
    email: 'leila.mahmoudi@email.tn',
    address: '20 Avenue Client 2, Sfax',
    city: 'Sfax',
    clientType: 'particulier',
    vehicles: [
      {
        vin: 'VF7YYYYYYYYYYYYYYY',
        brand: 'Renault',
        model: 'Clio',
        year: 2019,
        engine: '1.5 dCi',
        fuelType: 'diesel',
        mileage: 78000,
        acquisitionDate: new Date('2019-05-20'),
      },
    ],
  },
  {
    firstName: 'Garage',
    lastName: 'Auto Service',
    phones: ['+216 71 333 333'],
    email: 'contact@garage-autoservice.tn',
    address: '30 Boulevard Client 3, Sousse',
    city: 'Sousse',
    taxId: 'P123456789',
    clientType: 'professionnel',
    vehicles: [
      {
        vin: 'VF1ZZZZZZZZZZZZZZZ',
        brand: 'Citroën',
        model: 'C3',
        year: 2021,
        engine: '1.2 PureTech',
        fuelType: 'essence',
        mileage: 25000,
        acquisitionDate: new Date('2021-01-10'),
      },
    ],
  },
];

// Générer des pièces automobiles avec références OEM réalistes et tous les scénarios
function generateProducts(companyId, brands, suppliers) {
  const products = [];
  let skuCounter = 1;

  // Descriptions variées pour rendre les produits plus réalistes
  const descriptions = [
    "Pièce d'origine ou équivalente",
    'Compatibilité universelle',
    'Garantie constructeur',
    'Haute qualité OEM',
    'Pièce de rechange professionnelle',
    'Testée et certifiée',
    'Compatible toutes versions',
    'Livraison rapide',
    'Qualité premium',
    'Référence originale',
  ];

  CATEGORIES.forEach(category => {
    category.subCategories.forEach(subCategory => {
      // Générer 3-5 produits par sous-catégorie pour avoir plus de 100 produits
      const numProducts = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < numProducts; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const brandPrefix = brand.name.substring(0, 3).toUpperCase();
        const manufacturerRef = `${brandPrefix}-${String(skuCounter).padStart(6, '0')}`;

        // Générer plusieurs références OEM (1-5)
        const oemRefs = [];
        const numOemRefs = Math.floor(Math.random() * 5) + 1;
        const oemBrands = ['OEM', 'REF', 'ALT', 'GEN', 'EQ'];
        for (let j = 0; j < numOemRefs; j++) {
          const oemBrand =
            oemBrands[Math.floor(Math.random() * oemBrands.length)];
          oemRefs.push(
            `${oemBrand}-${Math.floor(Math.random() * 900000) + 100000}`
          );
        }

        // Prix variables selon la catégorie
        let basePrice;
        if (['Moteur', 'Transmission', 'Électricité'].includes(category.name)) {
          basePrice = Math.floor(Math.random() * 500) + 50; // 50-550 TND
        } else if (['Carrosserie', 'Échappement'].includes(category.name)) {
          basePrice = Math.floor(Math.random() * 300) + 30; // 30-330 TND
        } else {
          basePrice = Math.floor(Math.random() * 200) + 10; // 10-210 TND
        }

        const purchasePrice = basePrice;

        // Marges variées (15% à 50%)
        const margin = 15 + Math.random() * 35;
        const salePrice = Math.round(purchasePrice * (1 + margin / 100));

        // Scénarios de stock variés
        let stockQty, minStock, maxStock, isActive;

        // 10% des produits en rupture de stock
        // 20% des produits avec stock faible (< minStock)
        // 30% des produits avec stock normal
        // 30% des produits avec stock élevé
        // 10% des produits inactifs
        const scenario = Math.random();

        if (scenario < 0.1) {
          // Rupture de stock
          stockQty = 0;
          minStock = Math.floor(Math.random() * 10) + 5;
          maxStock = Math.floor(Math.random() * 50) + 50;
          isActive = true;
        } else if (scenario < 0.3) {
          // Stock faible
          minStock = Math.floor(Math.random() * 10) + 5;
          maxStock = Math.floor(Math.random() * 50) + 50;
          stockQty = Math.floor(Math.random() * (minStock - 1));
          isActive = true;
        } else if (scenario < 0.6) {
          // Stock normal
          minStock = Math.floor(Math.random() * 10) + 5;
          maxStock = Math.floor(Math.random() * 100) + 50;
          stockQty =
            Math.floor(Math.random() * (maxStock - minStock)) + minStock;
          isActive = true;
        } else if (scenario < 0.9) {
          // Stock élevé
          minStock = Math.floor(Math.random() * 10) + 5;
          maxStock = Math.floor(Math.random() * 200) + 100;
          stockQty =
            Math.floor(Math.random() * (maxStock * 1.5 - maxStock)) + maxStock;
          isActive = true;
        } else {
          // Produit inactif
          stockQty = Math.floor(Math.random() * 50);
          minStock = Math.floor(Math.random() * 10) + 5;
          maxStock = Math.floor(Math.random() * 100) + 50;
          isActive = false;
        }

        // Ajouter des informations fournisseur pour certains produits (30%)
        const supplierInfos = [];
        if (Math.random() < 0.3 && suppliers.length > 0) {
          const numSuppliers = Math.floor(Math.random() * 2) + 1; // 1-2 fournisseurs par produit
          const selectedSuppliers = suppliers
            .sort(() => Math.random() - 0.5)
            .slice(0, numSuppliers);

          selectedSuppliers.forEach((supplier, idx) => {
            const supplierPrice = purchasePrice * (0.8 + Math.random() * 0.4); // ±20% variation
            supplierInfos.push({
              supplierId: supplier._id,
              supplierName: supplier.name,
              lastPurchasePrice: Math.round(supplierPrice),
              averagePurchasePrice: Math.round(
                supplierPrice * (0.9 + Math.random() * 0.2)
              ),
              totalQtyPurchased: Math.floor(Math.random() * 100) + 10,
              lastPurchaseDate: new Date(
                Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
              ), // Derniers 90 jours
              isPreferred: idx === 0, // Premier fournisseur est préféré
            });
          });
        }

        // Description variée (parfois vide, parfois détaillée)
        const hasDescription = Math.random() > 0.2; // 80% ont une description
        const description = hasDescription
          ? `${descriptions[Math.floor(Math.random() * descriptions.length)]}. ${subCategory} compatible ${brand.name} - Réf: ${manufacturerRef}. OEM: ${oemRefs.slice(0, 2).join(', ')}`
          : undefined;

        // Tags occasionnels (30% des produits)
        const tags = [];
        if (Math.random() < 0.3) {
          const possibleTags = [
            'premium',
            'urgent',
            'nouveau',
            'promotion',
            'original',
            'garantie',
            'certifié',
          ];
          const numTags = Math.floor(Math.random() * 3) + 1;
          tags.push(
            ...possibleTags.sort(() => Math.random() - 0.5).slice(0, numTags)
          );
        }

        // Notes occasionnelles (20% des produits)
        const notes =
          Math.random() < 0.2
            ? `Note: ${['Livraison sous 48h', 'Stock limité', 'Commande spéciale', 'Produit populaire', 'Vérifier compatibilité'][Math.floor(Math.random() * 5)]}`
            : undefined;

        products.push({
          companyId,
          manufacturerRef,
          oemRefs,
          name: `${subCategory} ${brand.name}`,
          description,
          brand: brand._id,
          category: category.name,
          subCategory,
          salePrice,
          purchasePrice,
          lastPurchasePrice: purchasePrice,
          taxRate: [7, 13, 19][Math.floor(Math.random() * 3)], // Différents taux de TVA
          marginRate: Math.round(margin),
          minMarginOnLastPurchase: Math.floor(Math.random() * 10) + 5, // 5-15%
          stockQty,
          minStock,
          maxStock: scenario < 0.9 ? maxStock : undefined, // Parfois pas de maxStock
          isActive,
          isDeleted: false,
          supplierInfos: supplierInfos.length > 0 ? supplierInfos : undefined,
          tags: tags.length > 0 ? tags : undefined,
          notes,
          pricingMode: 'HYBRID',
        });

        skuCounter++;
      }
    });
  });

  return products;
}

/**
 * Migre les anciennes données avec sku vers manufacturerRef
 * Cette fonction migre :
 * - Les produits avec sku vers manufacturerRef
 * - Les items des ventes avec sku vers manufacturerRef
 */
async function migrateSkuToManufacturerRef() {
  try {
    console.log('🔄 Migration des données sku vers manufacturerRef...\n');

    // 0. Supprimer l'ancien index et créer le nouveau
    console.log('  🔧 Mise à jour des index MongoDB...');
    try {
      const productCollection = Product.collection;
      const indexes = await productCollection.indexes();

      // Trouver et supprimer tous les index qui incluent sku
      for (const idx of indexes) {
        const keys = Object.keys(idx.key || {});
        // Ignorer l'index _id par défaut
        if (idx.name === '_id_') continue;

        // Vérifier si l'index contient sku
        if (keys.includes('sku')) {
          try {
            // Essayer de supprimer par nom d'abord
            if (idx.name) {
              await productCollection.dropIndex(idx.name);
              console.log(`    ✓ Ancien index ${idx.name} supprimé`);
            } else {
              // Sinon, essayer par spécification
              await productCollection.dropIndex(idx.key);
              console.log(`    ✓ Ancien index avec sku supprimé`);
            }
          } catch (dropError) {
            // Ignorer si l'index n'existe pas ou ne peut pas être supprimé
            console.log(
              `    ⚠️  Impossible de supprimer l'index ${idx.name || JSON.stringify(idx.key)}: ${dropError.message}`
            );
          }
        }
      }

      // Vérifier si le nouveau index existe déjà
      const newIndexExists = indexes.some(idx => {
        const keys = Object.keys(idx.key || {});
        return keys.includes('manufacturerRef') && keys.includes('companyId');
      });

      if (!newIndexExists) {
        try {
          await productCollection.createIndex(
            { companyId: 1, manufacturerRef: 1 },
            { unique: true, name: 'companyId_1_manufacturerRef_1' }
          );
          console.log('    ✓ Nouveau index companyId_1_manufacturerRef_1 créé');
        } catch (createError) {
          console.log(
            `    ⚠️  Impossible de créer le nouvel index: ${createError.message}`
          );
        }
      } else {
        console.log(
          '    ✓ Nouveau index companyId_1_manufacturerRef_1 existe déjà'
        );
      }
    } catch (indexError) {
      console.log(
        '    ⚠️  Erreur lors de la mise à jour des index:',
        indexError.message
      );
      // Continuer même si la mise à jour des index échoue
    }

    console.log('');

    // 1. Migrer les produits
    const productsWithSku = await Product.find({
      $and: [
        { sku: { $exists: true, $nin: [null, ''] } },
        {
          $or: [
            { manufacturerRef: { $exists: false } },
            { manufacturerRef: null },
            { manufacturerRef: '' },
          ],
        },
      ],
    });

    if (productsWithSku.length > 0) {
      console.log(
        `  📦 Trouvé ${productsWithSku.length} produits avec sku à migrer...`
      );

      let migrated = 0;
      let skipped = 0;

      for (const product of productsWithSku) {
        // Vérifier si un produit avec ce manufacturerRef existe déjà pour la même entreprise
        const existingProduct = await Product.findOne({
          companyId: product.companyId,
          manufacturerRef: product.sku,
          _id: { $ne: product._id },
          isDeleted: { $ne: true },
        });

        if (existingProduct) {
          console.log(
            `  ⚠️  Produit ${product._id} : manufacturerRef "${product.sku}" existe déjà, suppression...`
          );
          // Si le manufacturerRef existe déjà, marquer ce produit comme supprimé
          product.isDeleted = true;
          await product.save();
          skipped++;
        } else {
          // Migrer sku vers manufacturerRef
          product.manufacturerRef = product.sku;
          // Supprimer le champ sku (MongoDB permettra cela avec $unset)
          await product.updateOne(
            { _id: product._id },
            {
              $set: { manufacturerRef: product.sku },
              $unset: { sku: '' },
            }
          );
          migrated++;
        }
      }

      console.log(
        `  ✅ ${migrated} produits migrés, ${skipped} produits ignorés (doublons)\n`
      );
    } else {
      console.log('  ✓ Aucun produit avec sku à migrer\n');
    }

    // 2. Migrer les items des ventes (Sale model)
    // Utiliser l'agrégation pour trouver les ventes avec items.sku
    const salesWithSku = await Sale.aggregate([
      {
        $match: {
          'items.sku': { $exists: true, $nin: [null, ''] },
        },
      },
    ]);

    if (salesWithSku.length > 0) {
      console.log(
        `  🛒 Trouvé ${salesWithSku.length} ventes avec items.sku à migrer...`
      );

      let migratedSales = 0;
      for (const saleData of salesWithSku) {
        const sale = await Sale.findById(saleData._id);
        if (sale && sale.items && Array.isArray(sale.items)) {
          let hasChanges = false;
          for (const item of sale.items) {
            if (item.sku && !item.manufacturerRef) {
              item.manufacturerRef = item.sku;
              delete item.sku;
              hasChanges = true;
            }
          }

          if (hasChanges) {
            // Marquer le champ items comme modifié
            sale.markModified('items');
            await sale.save();
            migratedSales++;
          }
        }
      }

      console.log(`  ✅ ${migratedSales} ventes migrées\n`);
    } else {
      console.log('  ✓ Aucune vente avec items.sku à migrer\n');
    }

    // 3. Supprimer définitivement tous les produits orphelins (avec sku mais sans manufacturerRef valide)
    const orphanProducts = await Product.find({
      sku: { $exists: true },
      $or: [
        { manufacturerRef: { $exists: false } },
        { manufacturerRef: null },
        { manufacturerRef: '' },
      ],
    });

    if (orphanProducts.length > 0) {
      console.log(
        `  🗑️  Suppression de ${orphanProducts.length} produits orphelins (sku sans manufacturerRef)...`
      );
      await Product.deleteMany({
        _id: { $in: orphanProducts.map(p => p._id) },
      });
      console.log('  ✅ Produits orphelins supprimés\n');
    }

    // 4. Supprimer le champ sku de tous les produits restants (nettoyage final)
    const result = await Product.updateMany(
      { sku: { $exists: true } },
      { $unset: { sku: '' } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `  🧹 Nettoyage : ${result.modifiedCount} produits nettoyés (champ sku supprimé)\n`
      );
    }

    console.log('✅ Migration terminée avec succès!\n');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Fonction principale
async function seedTestData() {
  try {
    console.log('🌱 Démarrage de la génération des données de test...\n');

    // Connexion à MongoDB
    await connectDB();
    console.log('✅ Connecté à MongoDB\n');

    // Migrer les anciennes données sku vers manufacturerRef
    await migrateSkuToManufacturerRef();

    // Nettoyer les anciennes données de test (optionnel - commenter si vous voulez garder les données)
    const existingCompany = await Company.findOne({
      email: TEST_COMPANY.email,
    });
    if (existingCompany) {
      console.log(
        '⚠️  Une entreprise de test existe déjà. Suppression des anciennes données...'
      );
      const companyId = existingCompany._id;

      // Supprimer toutes les données associées
      await User.deleteMany({ companyId });
      await Brand.deleteMany({ companyId });
      // Supprimer les produits (anciens avec sku et nouveaux avec manufacturerRef)
      await Product.deleteMany({ companyId });
      await Customer.deleteMany({ companyId });
      await Supplier.deleteMany({ companyId });
      await CustomerFinance.deleteMany({ companyId });
      // Supprimer aussi les ventes associées (qui peuvent avoir items.sku)
      await Sale.deleteMany({ companyId });

      // Supprimer l'entreprise
      await Company.deleteOne({ _id: companyId });
      console.log('✅ Anciennes données supprimées\n');
    }

    // 1. Créer l'entreprise
    console.log("📦 Création de l'entreprise de test...");
    const company = await Company.create(TEST_COMPANY);
    console.log(`✅ Entreprise créée: ${company.name} (ID: ${company._id})\n`);

    // 2. Créer l'utilisateur (owner)
    console.log("👤 Création de l'utilisateur de test...");
    const user = await User.create({
      ...TEST_USER,
      companyId: company._id,
    });
    console.log(`✅ Utilisateur créé: ${user.email} (Role: ${user.role})\n`);

    // 3. Créer les marques
    console.log('🏷️  Création des marques automobiles...');
    const createdBrands = [];
    for (const brandName of BRANDS) {
      const brand = await Brand.create({
        companyId: company._id,
        name: brandName,
      });
      createdBrands.push(brand);
      console.log(`  ✓ ${brandName}`);
    }
    console.log(`✅ ${createdBrands.length} marques créées\n`);

    // 4. Créer les fournisseurs
    console.log('🚚 Création des fournisseurs...');
    const createdSuppliers = [];
    for (const supplierData of SUPPLIERS) {
      const supplier = await Supplier.create({
        ...supplierData,
        companyId: company._id,
        isActive: true,
        isDeleted: false,
      });
      createdSuppliers.push(supplier);
      console.log(`  ✓ ${supplier.name}`);
    }
    console.log(`✅ ${createdSuppliers.length} fournisseurs créés\n`);

    // 5. Créer les produits (pièces automobiles)
    console.log(
      '🔧 Création des pièces automobiles avec tous les scénarios...'
    );
    const productsData = generateProducts(
      company._id,
      createdBrands,
      createdSuppliers
    );
    const createdProducts = [];

    console.log(`  📊 Génération de ${productsData.length} produits...`);

    // Statistiques des scénarios
    const stats = {
      total: productsData.length,
      enStock: 0,
      ruptureStock: 0,
      stockFaible: 0,
      stockEleve: 0,
      inactifs: 0,
      avecFournisseurs: 0,
    };

    productsData.forEach(p => {
      if (p.stockQty === 0) stats.ruptureStock++;
      else if (p.stockQty < p.minStock) stats.stockFaible++;
      else if (p.stockQty > p.maxStock) stats.stockEleve++;
      else stats.enStock++;
      if (!p.isActive) stats.inactifs++;
      if (p.supplierInfos && p.supplierInfos.length > 0)
        stats.avecFournisseurs++;
    });

    // Créer les produits par lots pour éviter les problèmes de mémoire
    const batchSize = 25;
    for (let i = 0; i < productsData.length; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize);
      const products = await Product.insertMany(batch);
      createdProducts.push(...products);
      const progress = (
        (createdProducts.length / productsData.length) *
        100
      ).toFixed(1);
      console.log(
        `  ✓ ${createdProducts.length}/${productsData.length} produits créés (${progress}%)...`
      );
    }

    console.log(`✅ ${createdProducts.length} pièces automobiles créées`);
    console.log(`  📈 Répartition:`);
    console.log(`    • En stock normal: ${stats.enStock}`);
    console.log(`    • Rupture de stock: ${stats.ruptureStock}`);
    console.log(`    • Stock faible: ${stats.stockFaible}`);
    console.log(`    • Stock élevé: ${stats.stockEleve}`);
    console.log(`    • Inactifs: ${stats.inactifs}`);
    console.log(`    • Avec fournisseurs: ${stats.avecFournisseurs}\n`);

    // 6. Créer les clients
    console.log('👥 Création des clients...');
    const createdCustomers = [];
    for (const customerData of CUSTOMERS) {
      const customer = await Customer.create({
        ...customerData,
        companyId: company._id,
        isActive: true,
        isDeleted: false,
      });
      createdCustomers.push(customer);
      console.log(
        `  ✓ ${customer.firstName} ${customer.lastName} (${customer.clientType})`
      );

      // Créer les CustomerFinance pour chaque client
      await CustomerFinance.create({
        companyId: company._id,
        customerId: customer._id,
        creditLimit: customer.clientType === 'professionnel' ? 5000 : 1000,
        balance: 0,
        unpaidAmount: 0,
        overdueAmount: 0,
        customDiscount: 0,
        monthlyAveragePurchase: Math.floor(Math.random() * 2000) + 100,
      });
    }
    console.log(
      `✅ ${createdCustomers.length} clients créés avec leurs finances\n`
    );

    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 GÉNÉRATION TERMINÉE AVEC SUCCÈS!');
    console.log('='.repeat(60));
    console.log('\n📊 Résumé des données créées:');
    console.log(`  • Entreprise: 1 (${company.name})`);
    console.log(`  • Utilisateur: 1 (${user.email})`);
    console.log(`  • Marques: ${createdBrands.length}`);
    console.log(`  • Fournisseurs: ${createdSuppliers.length}`);
    console.log(`  • Produits (pièces): ${createdProducts.length}`);
    console.log(`  • Clients: ${createdCustomers.length}`);
    console.log('\n🔑 Identifiants de connexion:');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Mot de passe: ${TEST_USER.password}`);
    console.log(
      "\n✨ Vous pouvez maintenant vous connecter et tester l'application!\n"
    );
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération des données:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Exécuter le script
seedTestData()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

4;

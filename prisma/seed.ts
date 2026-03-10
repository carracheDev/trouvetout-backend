import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Catégories par défaut pour la plateforme
const categoriesParDefaut = [
  { nom: 'Téléphones & Tablettes', slug: 'telephones-tablettes', icone: 'phone-iphone', couleur: '#2563EB' },
  { nom: 'Ordinateurs', slug: 'ordinateurs', icone: 'laptop', couleur: '#7C3AED' },
  { nom: 'Accessoires', slug: 'accessoires', icone: 'headphones', couleur: '#059669' },
  { nom: 'Vêtements', slug: 'vetements', icone: 'checkroom', couleur: '#DC2626' },
  { nom: 'Alimentaire', slug: 'alimentaire', icone: 'restaurant', couleur: '#F59E0B' },
  { nom: 'Maison & Décoration', slug: 'maison-decoration', icone: 'home', couleur: '#8B5CF6' },
  { nom: 'Beauté & Santé', slug: 'beaute-sante', icone: 'spa', couleur: '#EC4899' },
  { nom: 'Sports & Loisirs', slug: 'sports-loisirs', icone: 'sports-soccer', couleur: '#10B981' },
  { nom: 'Livres & Médias', slug: 'livres-medias', icone: 'menu-book', couleur: '#6366F1' },
  { nom: 'Services', slug: 'services', icone: 'miscellaneous_services', couleur: '#64748B' },
];

async function main() {
  console.log('Starting seed...');

  // Hash password
  const hash = await bcrypt.hash('admin123', 12);

  // Create admin user
  const admin = await prisma.utilisateur.create({
    data: {
      nom: 'Super Admin',
      email: 'admin@trouvetout.com',
      motDePasse: hash,
      roles: {
        create: {
          type: 'ADMIN',
        },
      },
      panier: {
        create: {},
      },
      pointsFidelite: {
        create: {},
      },
    },
  });

  console.log('Admin created:', admin.email);

  // Créer les catégories par défaut
  console.log('Creating default categories...');
  
  for (let i = 0; i < categoriesParDefaut.length; i++) {
    const cat = categoriesParDefaut[i];
    await prisma.categorie.create({
      data: {
        nom: cat.nom,
        slug: cat.slug,
        icone: cat.icone,
        couleur: cat.couleur,
        estActif: true,
        ordre: i,
      },
    });
    console.log(`  - Created category: ${cat.nom}`);
  }

  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


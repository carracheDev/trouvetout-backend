import { PrismaClient } from "@prisma/client";

// Si tu veux configurer PrismaClient globalement
export const prisma = new PrismaClient({
  // Exemple : adapter direct à ta DB
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // à mettre dans ton .env
    },
  },
});
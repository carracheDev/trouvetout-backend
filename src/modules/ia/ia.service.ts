// src/modules/ia/ia.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatbotDto, AnalyseProduitDto, SuggestionPrixDto } from './dto/ia.dto';

@Injectable()
export class IaService {
  private anthropicApiKey: string;

  constructor(private prisma: PrismaService) {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  private isApiAvailable(): boolean {
    return !!this.anthropicApiKey && this.anthropicApiKey.length > 0;
  }

  // ─── Chatbot produit ───────────────────────────────────
  async chatbot(userId: string, dto: ChatbotDto) {
    // Fallback si pas de clé API
    if (!this.isApiAvailable()) {
      return this.chatbotFallback(dto);
    }

    let contexteProduit = '';

    // Enrichir avec le contexte du produit si fourni
    if (dto.produitId) {
      const produit = await this.prisma.produit.findFirst({
        where: { id: dto.produitId, deletedAt: null },
        include: {
          categorie: { select: { nom: true } },
          vendeur: { select: { nomBoutique: true } },
          medias: { take: 3 },
          avis: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { note: true, commentaire: true },
          },
        },
      });

      if (produit) {
        contexteProduit = `
PRODUIT EN CONTEXTE:
- Nom: ${produit.nom}
- Prix: ${produit.prix.toLocaleString()} FCFA
- Catégorie: ${produit.categorie.nom}
- Vendeur: ${produit.vendeur.nomBoutique}
- Stock: ${produit.stock} unités disponibles
- Description: ${produit.description}
- Note moyenne: ${produit.noteMoyenne}/5 (${produit.nombreAvis} avis)
${produit.avis.length > 0 ? `- Avis clients: ${produit.avis.map((a) => `"${a.commentaire}" (${a.note}/5)`).join(', ')}` : ''}
`;
      }
    }

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: this.anthropicApiKey });

      const systemPrompt = `Tu es TrouveTout Assistant, un assistant commercial intelligent pour la marketplace TrouveTout au Bénin.

TU AIDES LES CLIENTS À:
- Trouver les bons produits selon leurs besoins et budget
- Comparer des produits
- Comprendre les caractéristiques techniques
- Prendre des décisions d'achat éclairées
- Obtenir des infos sur les livraisons et paiements

CONTEXTE PLATEFORME:
- Marketplace locale au Bénin (Cotonou et environs)
- Paiement: MTN Money, Moov Money, Flooz, Carte bancaire
- Livraison: 0-15 km selon zones
- Commission: 8% sur chaque vente
- Points fidélité: 1 point par 100 FCFA dépensés

${contexteProduit}

RÈGLES:
- Réponds TOUJOURS en français
- Sois concis, chaleureux et utile
- Si tu ne sais pas, dis-le honnêtement
- Ne donne PAS de conseils hors sujet commerce
- Maximum 3 paragraphes par réponse`;

      const messages = [
        ...(dto.historique || []),
        { role: 'user' as const, content: dto.message },
      ];

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });

      const reponse =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        reponse,
        historique: [
          ...(dto.historique || []),
          { role: 'user', content: dto.message },
          { role: 'assistant', content: reponse },
        ],
      };
    } catch (error: any) {
      console.error('Erreur Anthropic API:', error.message);
      // Fallback en cas d'erreur
      return this.chatbotFallback(dto);
    }
  }

  // ─── Fallback chatbot local ─────────────────────────────
  private chatbotFallback(dto: ChatbotDto) {
    const message = dto.message.toLowerCase();
    let reponse = '';

    // Réponses basées sur des mots-clés
    if (message.includes('paiement') || message.includes('payer') || message.includes('money')) {
      reponse = `Sur TrouveTout, vous pouvez payer via:
• MTN Money
• Moov Money  
• Flooz
• Carte bancaire

Choisissez le mode qui vous convient le mieux lors du checkout!`;
    } else if (message.includes('livraison') || message.includes('livrer')) {
      reponse = `Nous livrons dans la zone de Cotonou et environs!
• Livraison standard: 1-3 jours
• Les frais de livraison varient selon la distance (0-15 km)
• Vous pouvez suivre votre commande en temps réel`;
    } else if (message.includes('retour') || message.includes('rembours')) {
      reponse = `Oui, nous avons une politique de retour:
• Retour possible sous 7 jours si le produit ne correspond pas
• Le remboursement est effectuées sous 5 jours ouvrés
• Contacter le vendeur pour initier un retour`;
    } else if (message.includes('promo') || message.includes('reduction') || message.includes('code')) {
      reponse = `Profitez de nos offres!
• Codes promo disponibles chez certains vendeurs
• Programme de fidélité: 1 point par 100 FCFA
• Événements promotionnels réguliers`;
    } else if (message.includes('produit') || message.includes('acheter')) {
      reponse = `Parfait! Sur TrouveTout vous trouverez plein de produits dans différentes catégories:
• Téléphones & Tablettes
• Ordinateurs
• Accessoires
• Vêtements
• Alimentaire
• Maison & Décoration
• Beauté & Santé
• Sports & Loisirs

Parlez-moi de ce que vous cherchez!`;
    } else {
      reponse = `Bonjour! Je suis l'assistant TrouveTout. Je peux vous aider avec:
• Informations sur les produits
• Modes de paiement (MTN Money, Moov Money, Flooz)
• Suivi de livraison
• Retours et remboursements
• Codes promo

Que souhaitez-vous savoir?`;
    }

    return {
      reponse,
      historique: [
        ...(dto.historique || []),
        { role: 'user', content: dto.message },
        { role: 'assistant', content: reponse },
      ],
    };
  }

  // ─── Analyse produit vendeur ───────────────────────────
  async analyserProduit(vendeurUserId: string, dto: AnalyseProduitDto) {
    const produit = await this.prisma.produit.findFirst({
      where: {
        id: dto.produitId,
        vendeur: { utilisateurId: vendeurUserId },
        deletedAt: null,
      },
      include: {
        categorie: true,
        avis: { select: { note: true, commentaire: true } },
        _count: {
          select: { likes: true, commentaires: true, favoris: true },
        },
      },
    });

    if (!produit) throw new BadRequestException('Produit introuvable');

    // Fallback si pas d'API
    if (!this.isApiAvailable()) {
      return this.analyserProduitFallback(produit);
    }

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: this.anthropicApiKey });

      const prompt = `Analyse ce produit vendu sur TrouveTout (marketplace Bénin) et donne des conseils concrets au vendeur:

DONNÉES PRODUIT:
- Nom: ${produit.nom}
- Prix: ${produit.prix.toLocaleString()} FCFA
- Catégorie: ${produit.categorie.nom}
- Stock: ${produit.stock}
- Ventes: ${produit.nombreVentes}
- Likes: ${produit._count.likes}
- Favoris: ${produit._count.favoris}
- Note: ${produit.noteMoyenne}/5 (${produit.nombreAvis} avis)
- Description: ${produit.description}
${produit.avis.length > 0 ? `- Avis: ${produit.avis.slice(0, 5).map((a) => `"${a.commentaire}" (${a.note}/5)`).join(' | ')}` : ''}

Fournis en JSON (sans markdown):
{
  "score": number (0-100),
  "points_forts": ["..."],
  "points_amelioration": ["..."],
  "conseil_prix": "...",
  "conseil_description": "...",
  "conseil_stock": "...",
  "prediction_ventes": "..."
}`;

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      try {
        return JSON.parse(text);
      } catch {
        return { analyse: text };
      }
    } catch (error: any) {
      console.error('Erreur Anthropic API:', error.message);
      return this.analyserProduitFallback(produit);
    }
  }

  private analyserProduitFallback(produit: any) {
    const score = Math.min(100, Math.round(
      (produit.noteMoyenne * 20) + 
      (produit.nombreVentes * 2) + 
      (produit._count.likes * 1)
    ));

    return {
      score,
      points_forts: [
        'Produit actif et disponible',
        `Catégorie: ${produit.categorie.nom}`,
        produit.noteMoyenne > 4 ? 'Bonne note client' : null,
      ].filter(Boolean),
      points_amelioration: [
        produit.nombreAvis < 3 ? 'Ajouter plus d\'avis clients' : null,
        produit.stock < 5 ? 'Augmenter le stock' : null,
        produit.nombreVentes < 10 ? 'Promouvoir davantage' : null,
      ].filter(Boolean),
      conseil_prix: `Prix actuel de ${produit.prix.toLocaleString()} FCFA - vérifier la concurrence`,
      conseil_description: 'Ajouter plus de détails et caractéristiques techniques',
      conseil_stock: produit.stock < 10 ? 'Prévoir plus de stock pour les ventes' : 'Stock OK',
      prediction_ventes: produit.nombreVentes > 0 ? 'Tendance positive' : 'À développer',
    };
  }

  // ─── Suggestion de prix ────────────────────────────────
  async suggererPrix(dto: SuggestionPrixDto) {
    // Produits similaires en base
    const similaires = await this.prisma.produit.findMany({
      where: {
        categorieId: dto.categorieId,
        deletedAt: null,
        estDisponible: true,
      },
      select: { nom: true, prix: true, nombreVentes: true },
      orderBy: { nombreVentes: 'desc' },
      take: 10,
    });

    // Fallback ou calcul local
    if (!this.isApiAvailable() || similaires.length === 0) {
      return {
        prix_suggere: 10000,
        fourchette_min: 5000,
        fourchette_max: 25000,
        justification: 'Prix suggéré basé sur les standards du marché',
        strategie: 'milieu_de_gamme',
      };
    }

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: this.anthropicApiKey });

      const prompt = `Tu es un expert en pricing pour une marketplace e-commerce au Bénin.

NOUVEAU PRODUIT À PRICER:
- Nom: ${dto.nom}
- Description: ${dto.description}

PRODUITS SIMILAIRES SUR LA PLATEFORME:
${similaires.map((p) => `- ${p.nom}: ${p.prix.toLocaleString()} FCFA (${p.nombreVentes} ventes)`).join('\n')}

Réponds en JSON (sans markdown):
{
  "prix_suggere": number,
  "fourchette_min": number,
  "fourchette_max": number,
  "justification": "...",
  "strategie": "penetration|milieu_de_gamme|premium"
}`;

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      try {
        return JSON.parse(text);
      } catch {
        return { suggestion: text };
      }
    } catch (error: any) {
      console.error('Erreur Anthropic API:', error.message);
      const avgPrice = similaires.reduce((sum, p) => sum + p.prix, 0) / similaires.length;
      return {
        prix_suggere: Math.round(avgPrice),
        fourchette_min: Math.round(avgPrice * 0.7),
        fourchette_max: Math.round(avgPrice * 1.3),
        justification: 'Prix basé sur la moyenne des produits similaires',
        strategie: 'milieu_de_gamme',
      };
    }
  }

  // ─── Générer description produit ──────────────────────
  async genererDescription(nom: string, details: string, categorieId: string) {
    // Fallback
    if (!this.isApiAvailable()) {
      return {
        description_courte: `${nom} - Qualité Premium`,
        description_longue: `Découvrez notre ${nom}! \n\n✓ Qualité garantie\n✓ Prix compétitif\n✓ Livraison rapide à Cotonou\n\n${details || 'Contactez-nous pour plus d\'informations!'}`,
        mots_cles: [nom.toLowerCase(), 'cotonou', 'livraison', 'qualité'],
      };
    }

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: this.anthropicApiKey });

      const prompt = `Génère une description commerciale courte et attractive pour ce produit vendu au Bénin.

Produit: ${nom}
Détails fournis: ${details}

Réponds en JSON (sans markdown):
{
  "description_courte": "...(max 150 caractères)",
  "description_longue": "...(max 400 caractères, accrocheur, points clés en bullet mental)",
  "mots_cles": ["...", "..."]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      try {
        return JSON.parse(text);
      } catch {
        return { description: text };
      }
    } catch (error: any) {
      console.error('Erreur Anthropic API:', error.message);
      return {
        description_courte: `${nom} - Qualité Premium`,
        description_longue: `Découvrez notre ${nom}! \n\n✓ Qualité garantie\n✓ Prix compétitif\n✓ Livraison rapide à Cotonou\n\n${details || 'Contactez-nous pour plus d\'informations!'}`,
        mots_cles: [nom.toLowerCase(), 'cotonou', 'livraison', 'qualité'],
      };
    }
  }
}


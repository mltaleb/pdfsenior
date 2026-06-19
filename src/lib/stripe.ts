export async function createCheckoutSession(priceId: string, email: string) {
  const response = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, email }),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const { url } = await response.json();
  return url;
}

export const PRICING_PLANS = [
  {
    id: 'limited-7day',
    name: 'Accès limité de 7 jours',
    price: '$0.95',
    priceId: 'price_limited_7day',
    features: ['Téléchargement de 3 documents', 'Formats PDF et JPG uniquement'],
    recommended: false,
  },
  {
    id: 'full-7day',
    name: 'Accès complet de 7 jours',
    price: '$1.95',
    priceId: 'price_full_7day',
    features: [
      'Remplissez, modifiez et enregistrez tous vos PDF',
      'Divisez ou fusionnez des documents en quelques secondes',
      'Accédez à tous vos fichiers depuis n\'importe quel appareil',
      'Convertissez des PDF depuis et vers Word, Excel, PPTX, JPG ou PNG',
      'Signez des documents en ligne rapidement et en toute sécurité',
      'Ajoutez de nouveaux champs à remplir à vos PDF',
      'Accédez à des modèles de formulaires prêts à l\'emploi',
    ],
    recommended: true,
  },
  {
    id: 'annual',
    name: 'Abonnement annuel',
    price: '$24.9',
    priceSuffix: '/mois',
    priceId: 'price_annual',
    features: [
      'Tout inclus dans l\'accès complet',
      'Documents illimités',
      'Support prioritaire',
      'Stockage cloud inclus',
    ],
    recommended: false,
  },
] as const;

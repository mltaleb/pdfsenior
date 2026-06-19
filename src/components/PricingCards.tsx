import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isAuthenticated, $isPaid } from '../stores/app-store';
import { PRICING_PLANS, createCheckoutSession } from '../lib/stripe';

export default function PricingCards() {
  const isAuthenticated = useStore($isAuthenticated);
  const [selectedPlan, setSelectedPlan] = useState('full-7day');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const plan = PRICING_PLANS.find(p => p.id === selectedPlan);
      if (!plan) return;

      try {
        const url = await createCheckoutSession(plan.priceId, 'user@example.com');
        if (url) {
          window.location.href = url;
          return;
        }
      } catch {
        // Stripe not configured — demo mode
      }

      // Demo: mark as paid and redirect
      $isPaid.set(true);
      alert('Mode démo : Paiement simulé avec succès ! Vous pouvez maintenant télécharger vos fichiers.');
      window.location.href = '/editor';
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '📝', text: 'Remplissez, modifiez et enregistrez tous vos PDF' },
    { icon: '✂️', text: 'Divisez ou fusionnez des documents en quelques secondes' },
    { icon: '📱', text: 'Accédez à tous vos fichiers depuis n\'importe quel appareil' },
    { icon: '🔄', text: 'Convertissez des PDF depuis et vers Word, Excel, PPTX, JPG ou PNG' },
    { icon: '✍️', text: 'Signez des documents en ligne rapidement et en toute sécurité' },
    { icon: '📋', text: 'Ajoutez de nouveaux champs à remplir à vos PDF' },
    { icon: '📄', text: 'Accédez à des modèles de formulaires prêts à l\'emploi' },
  ];

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-4 py-6 border-b border-gray-100">
        <Step number={1} label="Document fourni" active completed />
        <StepLine completed />
        <Step number={2} label="Abonnement sélectionné" active completed />
        <StepLine />
        <Step number={3} label="Paiement" />
        <StepLine />
        <Step number={4} label="Terminé" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">
          Sélectionnez une offre pour télécharger votre document
        </h1>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Document preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-primary-50 rounded-xl flex items-center justify-center">
                    <span className="text-primary-500 font-bold text-sm">PDF</span>
                  </div>
                  <p className="text-sm text-gray-500">Aperçu du document</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Pricing */}
          <div className="lg:col-span-3">
            {/* CTA Button */}
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full btn-primary text-lg py-4 mb-8 disabled:opacity-50"
            >
              {loading ? 'Traitement...' : 'Continuer'}
            </button>

            {/* Plan options */}
            <div className="space-y-3 mb-8">
              {PRICING_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-primary-500 bg-primary-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-primary-500' : 'border-gray-300'
                    }`}>
                      {selectedPlan === plan.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <span className="font-medium text-gray-800">{plan.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-gray-900">{plan.price}</span>
                    {'priceSuffix' in plan && (
                      <span className="text-sm text-gray-500">{plan.priceSuffix}</span>
                    )}
                    {plan.recommended && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded rotate-[-3deg]">
                        Recommandé
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Features list */}
            <div className="space-y-4">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{feature.icon}</span>
                  <span className="text-sm text-gray-700">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ number, label, active, completed }: {
  number: number;
  label: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        completed
          ? 'bg-primary-500 text-white'
          : active
            ? 'bg-primary-100 text-primary-600 border-2 border-primary-500'
            : 'bg-gray-200 text-gray-500'
      }`}>
        {completed ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : number}
      </div>
      <span className={`text-sm font-medium hidden md:inline ${
        active || completed ? 'text-gray-900' : 'text-gray-400'
      }`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ completed }: { completed?: boolean }) {
  return (
    <div className={`w-12 h-0.5 ${completed ? 'bg-primary-500' : 'bg-gray-200'}`} />
  );
}

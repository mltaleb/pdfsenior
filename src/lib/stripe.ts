const FUNCTIONS_URL =
  import.meta.env.PUBLIC_FIREBASE_FUNCTIONS_URL ||
  "https://us-central1-atfagni.cloudfunctions.net"

export async function createCheckoutSession(priceId: string) {
  const response = await fetch(`${FUNCTIONS_URL}/createCheckout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId,
      successUrl: `${window.location.origin}/editor?payment=success`,
      cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown" }))
    throw new Error(err.error || "Failed to create checkout session")
  }

  const { url } = await response.json()
  return url as string
}

export const PRICING_PLANS = [
  {
    id: "single",
    name: "Acces unique",
    description: "Telechargez le document en cours",
    price: "1.99 €",
    priceId: "price_1TknPLLekVKM7eN7SzN1makV",
    mode: "payment" as const,
    recommended: false,
  },
  {
    id: "day-pass",
    name: "Pass journee",
    description: "Telechargements illimites pendant 24h",
    price: "4.99 €",
    priceId: "price_1TknQTLekVKM7eN7ooGSKMp2",
    mode: "payment" as const,
    recommended: true,
  },
  {
    id: "monthly",
    name: "Abonnement mensuel",
    description: "Telechargements illimites",
    price: "9.99 €",
    priceSuffix: "/mois",
    priceId: "price_1TknRLLekVKM7eN7lYk4Y32g",
    mode: "subscription" as const,
    recommended: false,
  },
]

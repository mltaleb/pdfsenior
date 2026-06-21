export async function createCheckoutSession(priceId: string) {
  const response = await fetch("/api/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
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
    priceId: "prod_UkBMACWnWQ2qXG",
    mode: "payment" as const,
    recommended: false,
  },
  {
    id: "day-pass",
    name: "Pass journee",
    description: "Telechargements illimites pendant 24h",
    price: "4.99 €",
    priceId: "prod_UkBNYwUrsa5332",
    mode: "payment" as const,
    recommended: true,
  },
  {
    id: "monthly",
    name: "Abonnement mensuel",
    description: "Telechargements illimites",
    price: "9.99 €",
    priceSuffix: "/mois",
    priceId: "prod_UkBOyIZSUkDW6q",
    mode: "subscription" as const,
    recommended: false,
  },
]

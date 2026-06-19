import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { priceId, email } = await request.json();

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${new URL(request.url).origin}/editor?payment=success`,
      cancel_url: `${new URL(request.url).origin}/pricing?payment=cancelled`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

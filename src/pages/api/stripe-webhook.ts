import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 503 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Payment successful for:', session.customer_email);
        // TODO: Update user subscription status in Firebase
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription.id);
        // TODO: Update user subscription status in Firebase
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    console.error('Webhook error:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }
};

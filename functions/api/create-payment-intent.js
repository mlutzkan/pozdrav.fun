const PRICES   = { basic: 3900, premium: 5900, signature: 9900 };
const DELIVERY  = { basic: 'до 72 часа', premium: 'до 48 часа', signature: 'до 24 часа' };

const PROMO_CODES = {
  'admintest2114': { type: 'fixed',   amountCents: 1 },
  'megak':         { type: 'percent', discount: 0.5 },
  'launch50':      { type: 'percent', discount: 0.5 },
};

function applyPromo(amount, code) {
  if (!code) return amount;
  const promo = PROMO_CODES[code.toLowerCase().trim()];
  if (!promo) return amount;
  if (promo.type === 'fixed')   return promo.amountCents;
  if (promo.type === 'percent') return Math.max(1, Math.round(amount * (1 - promo.discount)));
  return amount;
}

export async function onRequestPost({ request, env }) {
  try {
    const { tier, email, recipient, occasion, promoCode } = await request.json();

    const amount = applyPromo(PRICES[tier], promoCode);
    if (!PRICES[tier]) {
      return Response.json({ error: 'Невалиден пакет.' }, { status: 400 });
    }

    const orderNumber = (Math.floor(Math.random() * 90000) + 10000).toString();

    const params = new URLSearchParams({
      amount:                    amount.toString(),
      currency:                  'eur',
      receipt_email:             email || '',
      'payment_method_types[]':  'card',
      'metadata[orderNumber]':   orderNumber,
      'metadata[tier]':          tier,
      'metadata[recipient]':     recipient || '',
      'metadata[occasion]':      occasion  || '',
      'metadata[delivery]':      DELIVERY[tier],
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const intent = await stripeRes.json();
    if (intent.error) {
      return Response.json({ error: intent.error.message }, { status: 400 });
    }

    return Response.json({
      clientSecret:   intent.client_secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      orderNumber,
    });
  } catch (err) {
    return Response.json({ error: 'Нещо се обърка. Моля, опитай отново.' }, { status: 500 });
  }
}

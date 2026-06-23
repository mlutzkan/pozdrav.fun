const PRICES_CENTS = { basic: 3900, premium: 5900, signature: 9900 };

function applyPromo(amountCents, code, promoCodes) {
  const promo = promoCodes[code.toLowerCase().trim()];
  if (!promo) return null;
  if (promo.type === 'fixed')   return promo.amountCents;
  if (promo.type === 'percent') return Math.max(1, Math.round(amountCents * (1 - promo.discount)));
  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    const { code, tier } = await request.json();
    if (!code || !tier || !PRICES_CENTS[tier]) {
      return Response.json({ valid: false });
    }

    const promoCodes   = JSON.parse(env.PROMO_CODES || '{}');
    const baseCents    = PRICES_CENTS[tier];
    const discountedCents = applyPromo(baseCents, code, promoCodes);

    if (discountedCents === null) {
      return Response.json({ valid: false });
    }

    return Response.json({
      valid:           true,
      discountedPrice: (discountedCents / 100).toFixed(2),
      savings:         ((baseCents - discountedCents) / 100).toFixed(2),
    });
  } catch {
    return Response.json({ valid: false });
  }
}

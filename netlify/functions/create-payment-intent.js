const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Prices in euro cents — source of truth lives here, not on the client
const PRICES = {
  basic:     3900,
  premium:   5900,
  signature: 9900
};

const DELIVERY = {
  basic:     'до 72 часа',
  premium:   'до 48 часа',
  signature: 'до 24 часа'
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { tier, email, recipient, occasion } = JSON.parse(event.body);

    const amount = PRICES[tier];
    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Невалиден пакет.' })
      };
    }

    const orderNumber = (Math.floor(Math.random() * 90000) + 10000).toString();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      receipt_email: email,
      payment_method_types: ['card'],
      metadata: {
        orderNumber,
        tier,
        recipient: recipient || '',
        occasion:  occasion  || '',
        delivery:  DELIVERY[tier]
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSecret:   paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        orderNumber
      })
    };
  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Нещо се обърка. Моля, опитай отново.' })
    };
  }
};

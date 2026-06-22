// ─── STATE ─────────────────────────────────────────────────
const ORDER = {
  tier: null,
  price: null,
  step: 1,
  totalSteps: 7,
  goingBack: false,
  _stripe: null,
  _elements: null,
  _paymentReady: false,
  _orderNumber: null,
  data: {
    recipient: '',
    sender: '',
    occasion: '',
    occasionCustom: '',
    story: '',
    emotions: [],
    emotionsCustom: '',
    style: 'romantic',
    styleCustom: '',
    vocal: 'no-preference',
    includeWords: '',
    excludeWords: '',
    englishElements: false,
    email: ''
  }
};

const TIER_NAMES    = { basic: 'Basic', premium: 'Premium', signature: 'Signature' };
const TIER_DELIVERY = { basic: 'до 72 часа', premium: 'до 48 часа', signature: 'до 24 часа' };

// ─── OPEN / CLOSE ──────────────────────────────────────────
function openOrderForm(tier, price) {
  ORDER.tier  = tier;
  ORDER.price = price;
  ORDER.step  = 1;
  ORDER.goingBack    = false;
  ORDER._stripe       = null;
  ORDER._elements     = null;
  ORDER._paymentReady = false;
  ORDER._orderNumber  = null;
  ORDER.data.emotions = [];

  document.getElementById('order-tier-badge').textContent =
    `${TIER_NAMES[tier]} · €${price}`;

  // Duet — only Signature can select it
  const duetInput = document.querySelector('input[name="of-vocal"][value="duet"]');
  const duetCard  = duetInput?.closest('.order-radio-card');
  if (duetInput) {
    duetInput.disabled = tier !== 'signature';
    duetCard?.classList.toggle('vocal-locked', tier !== 'signature');
    if (tier !== 'signature' && duetInput.checked) {
      document.querySelector('input[name="of-vocal"][value="no-preference"]').checked = true;
    }
  }

  // Reset errors, chips, conditional fields
  document.querySelectorAll('.order-error-msg').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.order-input, .order-select, .order-textarea').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.order-chip').forEach(el => el.classList.remove('selected'));
  document.getElementById('occasion-custom-field').style.display = 'none';
  document.getElementById('style-custom-field').style.display    = 'none';
  document.getElementById('payment-error').style.display         = 'none';

  // Reset payment step UI
  document.getElementById('payment-loading').style.display           = 'flex';
  document.getElementById('payment-element-container').style.display = 'none';
  document.getElementById('payment-element').innerHTML               = '';

  // Show modal
  document.getElementById('order-body').style.display   = '';
  document.getElementById('order-footer').style.display = '';
  document.querySelector('.order-success').classList.remove('active');
  document.getElementById('order-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  showStep(1);
}

function closeOrderForm() {
  document.getElementById('order-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── NAVIGATION ────────────────────────────────────────────
function showStep(step) {
  document.querySelectorAll('.order-step').forEach(el => {
    el.classList.remove('active', 'going-back');
  });

  const stepEl = document.getElementById(`order-step-${step}`);
  if (!stepEl) return;
  if (ORDER.goingBack) stepEl.classList.add('going-back');
  stepEl.classList.add('active');

  const pct = ((step - 1) / ORDER.totalSteps) * 100;
  document.getElementById('order-progress-fill').style.width = pct + '%';
  document.getElementById('order-step-count').textContent =
    `Стъпка ${step} от ${ORDER.totalSteps}`;

  document.getElementById('order-back').classList.toggle('hidden', step === 1);

  const nextBtn = document.getElementById('order-next');
  nextBtn.disabled = false;
  if (step === ORDER.totalSteps) {
    nextBtn.textContent = `Плати €${ORDER.price}`;
    nextBtn.classList.add('final');
    initPaymentStep();
  } else {
    nextBtn.textContent = step === ORDER.totalSteps - 1 ? 'Продължи към плащане →' : 'Напред →';
    nextBtn.classList.remove('final');
  }

  document.getElementById('order-body').scrollTop = 0;
}

function nextStep() {
  if (ORDER.step === ORDER.totalSteps) {
    confirmPayment();
    return;
  }
  if (!validateStep(ORDER.step)) return;
  collectStepData(ORDER.step);

  ORDER.goingBack = false;
  ORDER.step++;
  showStep(ORDER.step);
}

function prevStep() {
  if (ORDER.step === 1) return;
  ORDER.goingBack = true;
  ORDER.step--;
  showStep(ORDER.step);
}

// ─── VALIDATION ────────────────────────────────────────────
function validateStep(step) {
  clearErrors(step);
  let valid = true;

  if (step === 1) {
    if (!val('of-recipient')) { markError('of-recipient', 'err-recipient'); valid = false; }
    if (!val('of-sender'))    { markError('of-sender',    'err-sender');    valid = false; }
    if (!val('of-occasion'))  { markError('of-occasion',  'err-occasion');  valid = false; }
    if (val('of-occasion') === 'other' && !val('of-occasion-custom')) {
      markError('of-occasion-custom', 'err-occasion-custom'); valid = false;
    }
  }
  if (step === 2) {
    if (val('of-story').length < 20) { markError('of-story', 'err-story'); valid = false; }
  }
  if (step === 3) {
    if (ORDER.data.emotions.length === 0 && !val('of-emotions-custom')) {
      document.getElementById('err-emotions').classList.add('visible'); valid = false;
    }
  }
  if (step === 4) {
    const style = document.querySelector('input[name="of-style"]:checked')?.value;
    if (style === 'other' && !val('of-style-custom')) {
      markError('of-style-custom', 'err-style-custom'); valid = false;
    }
  }
  if (step === 6) {
    const email = val('of-email');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      markError('of-email', 'err-email'); valid = false;
    }
  }

  return valid;
}

function clearErrors(step) {
  document.querySelectorAll(`#order-step-${step} .order-error-msg`).forEach(el => el.classList.remove('visible'));
  document.querySelectorAll(`#order-step-${step} .order-input, #order-step-${step} .order-select, #order-step-${step} .order-textarea`).forEach(el => el.classList.remove('error'));
}

function markError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) error.classList.add('visible');
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ─── DATA COLLECTION ───────────────────────────────────────
function collectStepData(step) {
  if (step === 1) {
    ORDER.data.recipient      = val('of-recipient');
    ORDER.data.sender         = val('of-sender');
    ORDER.data.occasion       = val('of-occasion');
    ORDER.data.occasionCustom = val('of-occasion-custom');
  }
  if (step === 2) { ORDER.data.story = val('of-story'); }
  if (step === 3) { ORDER.data.emotionsCustom = val('of-emotions-custom'); }
  if (step === 4) {
    ORDER.data.style       = document.querySelector('input[name="of-style"]:checked')?.value || 'romantic';
    ORDER.data.styleCustom = val('of-style-custom');
    ORDER.data.vocal       = document.querySelector('input[name="of-vocal"]:checked')?.value || 'no-preference';
  }
  if (step === 5) {
    ORDER.data.includeWords    = val('of-include');
    ORDER.data.excludeWords    = val('of-exclude');
    ORDER.data.englishElements = document.getElementById('of-english').checked;
  }
  if (step === 6) { ORDER.data.email = val('of-email'); }
}

// ─── EMOTION CHIPS ─────────────────────────────────────────
function toggleEmotion(chip, emotion) {
  const idx = ORDER.data.emotions.indexOf(emotion);
  if (idx === -1) { ORDER.data.emotions.push(emotion); chip.classList.add('selected'); }
  else            { ORDER.data.emotions.splice(idx, 1); chip.classList.remove('selected'); }
  if (ORDER.data.emotions.length > 0 || val('of-emotions-custom')) {
    document.getElementById('err-emotions').classList.remove('visible');
  }
}

// ─── PAYMENT — INIT ────────────────────────────────────────
async function initPaymentStep() {
  if (ORDER._paymentReady) return;

  // Show order summary
  const summaryEl = document.getElementById('payment-summary');
  summaryEl.innerHTML = `
    <div class="payment-summary-inner">
      <div class="payment-summary-row">
        <span>Персонализирана песен · <strong>${TIER_NAMES[ORDER.tier]}</strong></span>
        <span class="payment-summary-price">€${ORDER.price}</span>
      </div>
      <div class="payment-summary-detail">За ${ORDER.data.recipient || '—'} · Доставка ${TIER_DELIVERY[ORDER.tier]}</div>
    </div>
  `;

  const nextBtn = document.getElementById('order-next');
  nextBtn.disabled = true;

  try {
    const res = await fetch('/api/create-payment-intent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier:      ORDER.tier,
        email:     ORDER.data.email,
        recipient: ORDER.data.recipient,
        occasion:  ORDER.data.occasion
      })
    });

    if (!res.ok) throw new Error('Грешка при свързване с плащането.');
    const { clientSecret, publishableKey, orderNumber } = await res.json();
    if (!clientSecret) throw new Error('Невалиден отговор от сървъра.');

    ORDER._orderNumber = orderNumber;
    ORDER._stripe      = Stripe(publishableKey);
    ORDER._elements = ORDER._stripe.elements({
      clientSecret,
      locale: 'auto',
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary:    '#C9A84C',
          colorText:       '#1A1A2E',
          colorBackground: '#FFFFFF',
          colorDanger:     '#b94040',
          fontFamily:      'Inter, sans-serif',
          borderRadius:    '8px',
          spacingUnit:     '4px'
        },
        rules: {
          '.Input': {
            border:     '1.5px solid rgba(26,26,46,0.13)',
            boxShadow:  'none',
            padding:    '0.8rem 1rem',
            fontSize:   '0.95rem'
          },
          '.Input:focus': {
            border:     '1.5px solid #C9A84C',
            boxShadow:  '0 0 0 3px rgba(201,168,76,0.12)'
          },
          '.Label': {
            fontSize:   '0.8rem',
            fontWeight: '500',
            color:      '#1A1A2E'
          }
        }
      }
    });

    const paymentElement = ORDER._elements.create('payment', {
      layout: 'tabs',
      fields: {
        billingDetails: { email: 'never' }
      },
      wallets: {
        applePay: 'never',
        googlePay: 'never'
      }
    });
    paymentElement.mount('#payment-element');

    paymentElement.on('ready', () => {
      document.getElementById('payment-loading').style.display           = 'none';
      document.getElementById('payment-element-container').style.display = 'block';
      nextBtn.disabled    = false;
      ORDER._paymentReady = true;
    });

  } catch (err) {
    document.getElementById('payment-loading').style.display = 'none';
    const errEl = document.getElementById('payment-error');
    errEl.textContent    = err.message || 'Нещо се обърка. Презареди страницата и опитай отново.';
    errEl.style.display  = 'block';
    nextBtn.disabled     = false;
  }
}

// ─── PAYMENT — CONFIRM ─────────────────────────────────────
async function confirmPayment() {
  if (!ORDER._stripe || !ORDER._elements) return;

  const nextBtn = document.getElementById('order-next');
  const errEl   = document.getElementById('payment-error');

  nextBtn.disabled    = true;
  nextBtn.textContent = 'Обработване…';
  errEl.style.display = 'none';

  // Save order snapshot to sessionStorage in case 3DS redirect happens
  sessionStorage.setItem('pendingOrder', JSON.stringify({
    orderNumber:    ORDER._orderNumber,
    tier:           ORDER.tier,
    price:          ORDER.price,
    recipient:      ORDER.data.recipient,
    sender:         ORDER.data.sender,
    occasion:       ORDER.data.occasion,
    story:          ORDER.data.story,
    emotions:       ORDER.data.emotions,
    emotionsCustom: ORDER.data.emotionsCustom,
    style:          ORDER.data.style,
    styleCustom:    ORDER.data.styleCustom,
    vocal:          ORDER.data.vocal,
    includeWords:   ORDER.data.includeWords,
    excludeWords:   ORDER.data.excludeWords,
    englishElements: ORDER.data.englishElements,
    email:          ORDER.data.email
  }));

  const { error } = await ORDER._stripe.confirmPayment({
    elements: ORDER._elements,
    confirmParams: {
      return_url: `${window.location.origin}${window.location.pathname}?payment=success`,
      payment_method_data: {
        billing_details: { email: ORDER.data.email }
      }
    },
    redirect: 'if_required'
  });

  if (error) {
    sessionStorage.removeItem('pendingOrder');
    errEl.textContent    = error.message;
    errEl.style.display  = 'block';
    nextBtn.disabled     = false;
    nextBtn.textContent  = `Плати €${ORDER.price}`;
  } else {
    // Non-redirect path (no 3DS) — send emails now
    sendConfirmationEmails({
      orderNumber:    ORDER._orderNumber,
      tier:           ORDER.tier,
      price:          ORDER.price,
      recipient:      ORDER.data.recipient,
      sender:         ORDER.data.sender,
      occasion:       ORDER.data.occasion,
      story:          ORDER.data.story,
      emotions:       ORDER.data.emotions,
      emotionsCustom: ORDER.data.emotionsCustom,
      style:          ORDER.data.style,
      styleCustom:    ORDER.data.styleCustom,
      vocal:          ORDER.data.vocal,
      includeWords:   ORDER.data.includeWords,
      excludeWords:   ORDER.data.excludeWords,
      englishElements: ORDER.data.englishElements,
      email:          ORDER.data.email
    });
    sessionStorage.removeItem('pendingOrder');
    showSuccess();
  }
}

// ─── SEND CONFIRMATION EMAILS ──────────────────────────────
async function sendConfirmationEmails(payload) {
  try {
    await fetch('/api/send-confirmation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Email send failed:', e);
  }
}

// ─── SUCCESS ───────────────────────────────────────────────
function showSuccess() {
  document.getElementById('order-body').style.display   = 'none';
  document.getElementById('order-footer').style.display = 'none';
  document.querySelector('.order-success').classList.add('active');
  document.getElementById('order-progress-fill').style.width = '100%';
  document.getElementById('order-step-count').textContent    = 'Завършено ✓';
  document.getElementById('success-email').textContent    = ORDER.data.email;
  document.getElementById('success-delivery').textContent = TIER_DELIVERY[ORDER.tier];
}

// ─── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if returning from 3D Secure redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    window.history.replaceState({}, '', window.location.pathname);

    // Send confirmation emails using order data saved before redirect
    const pending = sessionStorage.getItem('pendingOrder');
    if (pending) {
      sendConfirmationEmails(JSON.parse(pending));
      sessionStorage.removeItem('pendingOrder');
    }

    const banner = document.getElementById('payment-success-banner');
    if (banner) banner.style.display = 'flex';
  }

  // Pricing buttons
  document.querySelectorAll('.order-trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openOrderForm(btn.dataset.tier, btn.dataset.price);
    });
  });

  // Modal controls
  document.getElementById('order-close').addEventListener('click', closeOrderForm);
  document.getElementById('order-backdrop').addEventListener('click', closeOrderForm);
  document.getElementById('order-next').addEventListener('click', nextStep);
  document.getElementById('order-back').addEventListener('click', prevStep);
  document.getElementById('order-success-close').addEventListener('click', closeOrderForm);

  // Occasion conditional field
  document.getElementById('of-occasion').addEventListener('change', function () {
    const field = document.getElementById('occasion-custom-field');
    field.style.display = this.value === 'other' ? 'block' : 'none';
    if (this.value !== 'other') document.getElementById('of-occasion-custom').value = '';
  });

  // Style conditional field
  document.querySelectorAll('input[name="of-style"]').forEach(radio => {
    radio.addEventListener('change', function () {
      const field = document.getElementById('style-custom-field');
      field.style.display = this.value === 'other' ? 'block' : 'none';
      if (this.value !== 'other') document.getElementById('of-style-custom').value = '';
    });
  });

  // Emotions custom — clear error when typing
  document.getElementById('of-emotions-custom').addEventListener('input', function () {
    if (this.value.trim()) document.getElementById('err-emotions').classList.remove('visible');
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('order-modal').classList.contains('open')) {
      closeOrderForm();
    }
  });
});

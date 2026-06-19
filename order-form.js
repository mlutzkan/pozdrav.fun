// ─── STATE ─────────────────────────────────────────────────
const ORDER = {
  tier: null,
  price: null,
  step: 1,
  totalSteps: 6,
  goingBack: false,
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
const TIER_DELIVERY = { basic: 'standard', premium: 'fast', signature: 'express' };

// ─── OPEN / CLOSE ──────────────────────────────────────────
function openOrderForm(tier, price) {
  ORDER.tier  = tier;
  ORDER.price = price;
  ORDER.step  = 1;
  ORDER.goingBack = false;
  ORDER.data.emotions = [];

  document.getElementById('order-tier-badge').textContent =
    `${TIER_NAMES[tier]} · €${price}`;

  // Duet option — only selectable for Signature
  const duetInput = document.querySelector('input[name="of-vocal"][value="duet"]');
  const duetCard  = duetInput?.closest('.order-radio-card');
  if (duetInput) {
    duetInput.disabled = tier !== 'signature';
    duetCard?.classList.toggle('vocal-locked', tier !== 'signature');
    if (tier !== 'signature' && duetInput.checked) {
      document.querySelector('input[name="of-vocal"][value="no-preference"]').checked = true;
    }
  }

  // Reset all error/visual state
  document.querySelectorAll('.order-error-msg').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.order-input, .order-select, .order-textarea').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.order-chip').forEach(el => el.classList.remove('selected'));
  document.getElementById('occasion-custom-field').style.display = 'none';
  document.getElementById('style-custom-field').style.display    = 'none';

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
  if (step === ORDER.totalSteps) {
    nextBtn.textContent = 'Поръчай песента си';
    nextBtn.classList.add('final');
  } else {
    nextBtn.textContent = 'Напред →';
    nextBtn.classList.remove('final');
  }

  document.getElementById('order-body').scrollTop = 0;
}

function nextStep() {
  if (!validateStep(ORDER.step)) return;
  collectStepData(ORDER.step);

  if (ORDER.step === ORDER.totalSteps) {
    submitOrder();
    return;
  }

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
      markError('of-occasion-custom', 'err-occasion-custom');
      valid = false;
    }
  }

  if (step === 2) {
    if (val('of-story').length < 20) {
      markError('of-story', 'err-story');
      valid = false;
    }
  }

  if (step === 3) {
    if (ORDER.data.emotions.length === 0 && !val('of-emotions-custom')) {
      document.getElementById('err-emotions').classList.add('visible');
      valid = false;
    }
  }

  if (step === 4) {
    const style = document.querySelector('input[name="of-style"]:checked')?.value;
    if (style === 'other' && !val('of-style-custom')) {
      markError('of-style-custom', 'err-style-custom');
      valid = false;
    }
  }

  if (step === 6) {
    const email = val('of-email');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      markError('of-email', 'err-email');
      valid = false;
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
    ORDER.data.recipient     = val('of-recipient');
    ORDER.data.sender        = val('of-sender');
    ORDER.data.occasion      = val('of-occasion');
    ORDER.data.occasionCustom = val('of-occasion-custom');
  }
  if (step === 2) {
    ORDER.data.story = val('of-story');
  }
  if (step === 3) {
    ORDER.data.emotionsCustom = val('of-emotions-custom');
  }
  if (step === 4) {
    ORDER.data.style      = document.querySelector('input[name="of-style"]:checked')?.value || 'romantic';
    ORDER.data.styleCustom = val('of-style-custom');
    ORDER.data.vocal      = document.querySelector('input[name="of-vocal"]:checked')?.value || 'no-preference';
  }
  if (step === 5) {
    ORDER.data.includeWords    = val('of-include');
    ORDER.data.excludeWords    = val('of-exclude');
    ORDER.data.englishElements = document.getElementById('of-english').checked;
  }
  if (step === 6) {
    ORDER.data.email = val('of-email');
  }
}

// ─── EMOTION CHIPS ─────────────────────────────────────────
function toggleEmotion(chip, emotion) {
  const idx = ORDER.data.emotions.indexOf(emotion);
  if (idx === -1) {
    ORDER.data.emotions.push(emotion);
    chip.classList.add('selected');
  } else {
    ORDER.data.emotions.splice(idx, 1);
    chip.classList.remove('selected');
  }
  if (ORDER.data.emotions.length > 0 || val('of-emotions-custom')) {
    document.getElementById('err-emotions').classList.remove('visible');
  }
}

// ─── SUBMIT ────────────────────────────────────────────────
function submitOrder() {
  collectStepData(ORDER.step);

  const payload = {
    tier:     ORDER.tier,
    price:    ORDER.price,
    delivery: TIER_DELIVERY[ORDER.tier] || 'standard',
    ...ORDER.data
  };

  // Payment integration goes here
  console.log('Order payload:', payload);

  document.getElementById('order-body').style.display   = 'none';
  document.getElementById('order-footer').style.display = 'none';
  document.querySelector('.order-success').classList.add('active');
  document.getElementById('order-progress-fill').style.width = '100%';
  document.getElementById('order-step-count').textContent    = 'Завършено ✓';

  const deliveryLabels = { standard: '72 часа', fast: '48 часа', express: '24 часа' };
  document.getElementById('success-email').textContent    = ORDER.data.email;
  document.getElementById('success-delivery').textContent =
    deliveryLabels[TIER_DELIVERY[ORDER.tier]] || '72 часа';
}

// ─── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
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

  // Occasion — show custom field when "Друго" selected
  document.getElementById('of-occasion').addEventListener('change', function () {
    const field = document.getElementById('occasion-custom-field');
    field.style.display = this.value === 'other' ? 'block' : 'none';
    if (this.value !== 'other') {
      document.getElementById('of-occasion-custom').value = '';
    }
  });

  // Style — show custom input when "Друго" selected
  document.querySelectorAll('input[name="of-style"]').forEach(radio => {
    radio.addEventListener('change', function () {
      const field = document.getElementById('style-custom-field');
      field.style.display = this.value === 'other' ? 'block' : 'none';
      if (this.value !== 'other') {
        document.getElementById('of-style-custom').value = '';
      }
    });
  });

  // Emotions custom field — clear chip error when user types
  document.getElementById('of-emotions-custom').addEventListener('input', function () {
    if (this.value.trim()) {
      document.getElementById('err-emotions').classList.remove('visible');
    }
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('order-modal').classList.contains('open')) {
      closeOrderForm();
    }
  });
});

const TIER_NAMES     = { basic: 'Basic', premium: 'Premium', signature: 'Signature' };
const DELIVERY_LABEL = { basic: 'стандартна', premium: 'бърза', signature: 'експрес' };
const DELIVERY_TIME  = { basic: 'до 72 часа', premium: 'до 48 часа', signature: 'до 24 часа' };

async function sendEmail({ apiKey, from, to, subject, text, html }) {
  const payload = { from, to: [to], subject };
  if (html) payload.html = html;
  else payload.text = text;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function onRequestPost({ request, env }) {
  try {
    const {
      orderNumber, tier, price,
      recipient, sender, occasion, story,
      emotions, emotionsCustom, style, styleCustom, vocal,
      includeWords, excludeWords, englishElements, email
    } = await request.json();

    const apiKey      = env.RESEND_API_KEY;
    const fromAddr    = 'pozdrav.fun <support@pozdrav.fun>';
    const adminEmail  = 'support@pozdrav.fun';
    const emotionList = [...(Array.isArray(emotions) ? emotions : []), emotionsCustom || ''].filter(Boolean).join(', ');
    const styleLabel  = styleCustom || style;
    const deliveryLabel = DELIVERY_LABEL[tier] || 'стандартна';

    // ── Admin notification (plain text) ─────────────────────────────────────
    await sendEmail({
      apiKey,
      from:    fromAddr,
      to:      adminEmail,
      subject: `Order #${orderNumber}`,
      text: [
        `Нова поръчка от pozdrav.fun`,
        ``,
        `Номер:    #${orderNumber}`,
        `Пакет:    ${TIER_NAMES[tier]} · €${price}`,
        `Доставка: ${DELIVERY_TIME[tier]}`,
        ``,
        `Имейл на клиента: ${email}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `ДЕТАЙЛИ НА ПОРЪЧКАТА`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `Получател:   ${recipient}`,
        `Подател:     ${sender}`,
        `Повод:       ${occasion}`,
        ``,
        `История:`,
        story,
        ``,
        `Емоции:      ${emotionList || '—'}`,
        `Стил:        ${styleLabel}`,
        `Глас:        ${vocal}`,
        ``,
        `Включи думи:  ${includeWords || '—'}`,
        `Изключи:      ${excludeWords || '—'}`,
        `Английски:    ${englishElements ? 'Да' : 'Не'}`,
      ].join('\n'),
    });

    // ── Customer confirmation (HTML) ─────────────────────────────────────────
    await sendEmail({
      apiKey,
      from:    fromAddr,
      to:      email,
      subject: `Потвърждение - поръчка #${orderNumber}`,
      html: `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

      <!-- Header -->
      <tr><td style="background:#1A1A2E;padding:28px 32px;text-align:center;">
        <div style="font-size:22px;font-weight:300;color:#ffffff;letter-spacing:0.05em;">
          pozdrav<span style="color:#C9A84C;">.fun</span>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:6px;letter-spacing:0.12em;text-transform:uppercase;">
          Персонализирани песни по поръчка
        </div>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-size:16px;color:#1A1A2E;margin:0 0 8px;">Здравейте,</p>
        <p style="font-size:15px;color:#4A4A6A;margin:0 0 24px;line-height:1.7;">
          Благодарим ви за доверието и поръчката! 🎵<br>
          Вашата заявка за персонална песен е успешно получена и вече е в процес на обработка.
        </p>

        <!-- Order summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;margin-bottom:14px;">
              🧾 Детайли на поръчката
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#4A4A6A;padding-bottom:6px;width:140px;">Получател:</td>
                <td style="font-size:13px;color:#1A1A2E;font-weight:500;padding-bottom:6px;">${recipient}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#4A4A6A;">Тип доставка:</td>
                <td style="font-size:13px;color:#1A1A2E;font-weight:500;">${deliveryLabel}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#4A4A6A;padding-top:6px;">Платена сума:</td>
                <td style="font-size:13px;color:#1A1A2E;font-weight:500;padding-top:6px;">€${price}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- What's next -->
        <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#C9A84C;margin:0 0 10px;">🎧 Какво следва?</p>
        <p style="font-size:14px;color:#4A4A6A;margin:0 0 8px;line-height:1.7;">
          Нашият екип започва да работи върху вашата персонална песен.
        </p>
        <p style="font-size:14px;color:#4A4A6A;margin:0 0 4px;line-height:1.7;">
          👉 Всяка песен се създава индивидуално, според вашата история и предоставените детайли.
        </p>
        <p style="font-size:14px;color:#4A4A6A;margin:0 0 24px;line-height:1.7;">
          👉 Обработваме текста, емоцията и структурата, за да направим възможно най-личен и въздействащ резултат.
        </p>

        <!-- Delivery times -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid rgba(26,26,46,0.08);border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:18px 22px;">
            <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#1A1A2E;margin-bottom:12px;">⏳ Време за изработка</div>
            <div style="font-size:13px;color:#4A4A6A;line-height:2;">
              Стандартна доставка: <strong style="color:#1A1A2E;">до 72 часа</strong><br>
              Бърза доставка: <strong style="color:#1A1A2E;">до 48 часа</strong><br>
              Експрес доставка: <strong style="color:#1A1A2E;">до 24 часа</strong>
            </div>
          </td></tr>
        </table>

        <p style="font-size:14px;color:#4A4A6A;margin:0 0 24px;line-height:1.7;">
          Ще получите готовата песен директно на този имейл.
        </p>

        <!-- Important note -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e8;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;margin-bottom:28px;">
          <tr><td style="padding:16px 20px;">
            <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#C9A84C;margin-bottom:6px;">💬 Важно</div>
            <p style="font-size:13px;color:#4A4A6A;margin:0;line-height:1.7;">
              Ако имате допълнителна информация, която искате да добавите (спомени, думи или детайли), можете да отговорите на този имейл.
            </p>
          </td></tr>
        </table>

        <p style="font-size:14px;color:#4A4A6A;margin:0 0 20px;line-height:1.7;">
          С най-добри пожелания,<br>
          <strong style="color:#1A1A2E;">Екипът на Pozdrav.fun</strong>
        </p>
        ${env.EMAIL_SIGNATURE_HTML || ''}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f5f3ee;padding:18px 32px;text-align:center;border-top:1px solid rgba(26,26,46,0.07);">
        <div style="font-size:11px;color:rgba(74,74,106,0.5);line-height:1.8;">
          pozdrav.fun · Персонализирани песни по поръчка<br>
          support@pozdrav.fun
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

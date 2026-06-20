import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = 'brayandmg1998@gmail.com'
const FROM_EMAIL = 'no-reply@cattaly.com'

const getPlanLabel = (planId: string) => {
  if (planId === 'monthly') return '1 Mes'
  if (planId === 'biannual') return '6 Meses'
  if (planId === 'annual') return 'Anual'
  return planId
}

const getMetodoLabel = (metodo: string) => {
  if (metodo === 'ves') return 'Bolívares (BCV)'
  if (metodo === 'binance') return 'Binance (USDT)'
  return metodo
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Supabase DB Webhook envía { type, table, record, old_record, schema }
    const record = payload?.record
    if (!record) {
      return new Response('No record found', { status: 400 })
    }

    const planLabel = getPlanLabel(record.plan_id || '')
    const metodoLabel = getMetodoLabel(record.metodo || '')
    const priceUsd = record.plan_price_usd || '—'
    const referencia = record.referencia || '—'
    const fechaPago = record.fecha_pago || '—'
    const ownerId = record.owner_id || '—'
    const createdAt = new Date(record.created_at || Date.now()).toLocaleString('es-VE')

    const html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 900; color: #1840f5;">Cataly</span>
        </div>

        <h2 style="font-size: 20px; font-weight: 800; color: #0e141b; margin: 0 0 8px;">
          💳 Nueva solicitud de pago recibida
        </h2>
        <p style="color: #555; font-size: 15px; margin: 0 0 24px;">
          Un usuario acaba de enviar un comprobante de pago y está esperando verificación.
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Plan</td>
            <td style="padding: 10px 0; color: #0e141b; font-weight: 700;">${planLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Monto</td>
            <td style="padding: 10px 0; color: #0e141b; font-weight: 700;">$${priceUsd} USD</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Método</td>
            <td style="padding: 10px 0; color: #0e141b; font-weight: 700;">${metodoLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Referencia</td>
            <td style="padding: 10px 0; color: #0e141b; font-weight: 700;">${referencia}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Fecha del pago</td>
            <td style="padding: 10px 0; color: #0e141b; font-weight: 700;">${fechaPago}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888; font-weight: 600;">Owner ID</td>
            <td style="padding: 10px 0; color: #0e141b; font-size: 12px; font-family: monospace;">${ownerId}</td>
          </tr>
        </table>

        <div style="margin-top: 28px;">
          <a
            href="https://cattaly.com/superadmin"
            style="display: inline-block; background: #1840f5; color: #fff; font-weight: 800; font-size: 15px; padding: 14px 24px; border-radius: 12px; text-decoration: none;"
          >Ir a revisar → Superadmin</a>
        </div>

        <p style="margin-top: 28px; font-size: 12px; color: #aaa;">
          Enviado automáticamente desde Cataly el ${createdAt}
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `💳 Nueva solicitud de pago — ${planLabel}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(`Resend error: ${err}`, { status: 500 })
    }

    const data = await res.json()
    console.log('Email enviado:', data.id)
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Error en edge function:', err)
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})

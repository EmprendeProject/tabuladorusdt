// lib/sendEmail.js
import { Resend } from 'resend';

// NOTA: Si usas esto directamente en el frontend (cliente), tu clave API se expondrá en el navegador.
// Lo ideal es realizar estos envíos desde un backend o a través de Supabase Edge Functions.
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || 're_TyEQvENy_AvJrv99EKtDq5ciaPBM4D3dZ');

export async function sendEmail({ to, subject, html, from }) {
  try {
    const { data, error } = await resend.emails.send({
      from: from || 'onboarding@resend.dev', // Usa tu dominio verificado en Resend una vez configurado
      to,
      subject,
      html,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error enviando email:', err);
    throw err;
  }
}
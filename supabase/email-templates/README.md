# Plantillas de correo (Supabase Auth)

Este folder guarda HTML listo para pegar en **Supabase Dashboard → Authentication → Email Templates**.

## Confirmación de registro

- Archivo: `confirm-signup.html`
- Plantilla a pegar: **Confirm signup** (Confirmar registro)
- Variable clave (Supabase): `{{ .ConfirmationURL }}`
  - Este link mantiene el flujo de Supabase.
  - La redirección final depende de `emailRedirectTo`.

### Importante (redirección a /login)

En el frontend ya se envía `emailRedirectTo` por defecto a `https://TU-DOMINIO/login` (o `http://localhost:5173/login` en dev), desde `src/data/authRepository.js`.

En Supabase también debes permitir el redirect:
- **Authentication → URL Configuration → Redirect URLs**
  - Agrega:
    - `http://localhost:5173/login`
    - `https://www.cataly.shop/login` (si aplica)
    - el dominio donde esté tu app (por ejemplo Vercel) + `/login`

Si usas múltiples dominios (staging/prod), agrega todos.

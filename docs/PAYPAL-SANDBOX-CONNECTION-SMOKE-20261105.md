# PayPal Sandbox: prueba manual de autenticación e identidad (2026-11-05)

Rama: `work/paypal-sandbox-20261105`. Archivo: `.github/workflows/paypal-sandbox-identity-manual.yml`.

## Alcance y restricciones
- `workflow_dispatch` exclusivamente. No se ejecuta en push, PR ni por horario.
- Sin despliegues, Railway, base de datos, migraciones, Yappy, pedidos, capturas, webhook ni pagos reales.
- Solo API `https://api-m.sandbox.paypal.com`. No usa el host Live.
- Se reutiliza la configuración conceptual del adaptador `core/runtime/paypal-provider.ts`: autenticación OAuth Sandbox y validación del comercio. No se invocan los métodos de creación/captura.
- No registra Client ID, Secret, token ni Merchant ID en logs. Resultados PASS/FAIL únicamente.

## Secretos requeridos en GitHub Actions
En **Settings → Secrets and variables → Actions → New repository secret**, configurar:
- `AD507_PAYPAL_SANDBOX_CLIENT_ID`: Client ID de la aplicación **Sandbox** Direcciones - LATAM.
- `AD507_PAYPAL_SANDBOX_CLIENT_SECRET`: Secret de esa misma aplicación Sandbox.
- `AD507_PAYPAL_SANDBOX_MERCHANT_ID`: Account ID de la cuenta comercial Sandbox asociada, no correo ni Client ID.

No introducir secretos en chat, archivos, commits, variables públicas ni capturas.

## Ejecución, solo después de configurar los tres secretos y con autorización
1. En GitHub abrir **Actions → PayPal Sandbox credential smoke test (manual)**. El workflow también se ejecuta al modificar exclusivamente su propio archivo en la rama de trabajo.
2. Si el workflow aparece disponible, seleccionar **Run workflow** y rama `work/paypal-sandbox-20261105`.
3. Revisar el resumen de ejecución. Si el workflow no aparece en Actions por no estar en la rama predeterminada, **no fusionar a main solo para habilitarlo**: requerir una revisión y autorización separadas.

## Criterios
1. OAuth: POST a `/v1/oauth2/token` con `grant_type=client_credentials`; respuesta 200 con token válido.
2. Identidad: la autenticación de aplicación por `client_credentials` **no demuestra** que el Merchant ID configurado pertenezca a esa aplicación. No se llama a `userinfo` con token de aplicación.
3. El workflow emite `PENDING: Merchant ID ownership cannot be verified by app-only OAuth`. La comprobación de receptor queda bloqueada hasta un flujo Sandbox autorizado que permita contrastar el `payee.merchant_id` de una orden y la cuenta receptora. **OAuth aprobado no significa Merchant ID validado**.
4. No se prueban recepción de webhooks, Checkout, publicación ni pagos reales.

## Evidencia disponible
- Implementación del workflow y documentación en GitHub; sin secretos no hay prueba real ni resultado de conectividad.
- El CI `42085643043` anterior fue simulado para PayPal. No presentarlo como validación real.
- Verificación de lectura del adaptador `core/runtime/paypal-provider.ts` en esta rama.
- Referencia oficial: https://developer.paypal.com/api/rest/authentication

**Estado:** preparado, pendiente de secretos y autorización expresa para ejecutar la prueba real.

## Corrección de diagnóstico
El intento inicial de validar `payer_id` con `/v1/identity/oauth2/userinfo` usando un token `client_credentials` era conceptualmente incorrecto. Se eliminó esa consulta; el resultado ahora separa `PASS` de OAuth y `PENDING` de identidad del comercio. Un resultado rojo anterior no permite atribuir el fallo a las claves sin revisar sus logs. El cambio no prueba Checkout, Live ni producción.

# PayPal Checkout Sandbox — 5 noviembre 2026, Panamá

Rama: `work/paypal-sandbox-20261105`. Base: `816a2a4`, conserva los cambios de códigos aprobados. Implementación `a1f7802`; fixtures corregidos `46990a7` y `1e8d726`. Código final comprobado: `1e8d726137003dfa5573c83676bf048627c7b8ed`.

## Resultado

Adaptador existente conectado al servidor, repositorio de pedidos, pantalla de pago y webhook. No se construyó otro almacén de pagos ni se modificó Yappy, sus credenciales, precios o el libro de direcciones históricas.

- Cotización e importes enteros propiedad del servidor, USD, propietario activo, origen exacto, JSON estricto y límites por usuario.
- Crear orden → aprobación alojada en PayPal Sandbox → captura autenticada o webhook APPROVED → nueva consulta al proveedor → confirmación de importe, moneda, comercio receptor, pedido y captura final COMPLETED.
- El navegador, una aprobación o una cancelación nunca prueban el pago. Rechazo/cancelación conservan el intento para conciliación, sin activar la dirección ni emitir otro cobro automáticamente.
- Verificación de firma mediante la API oficial PayPal sobre el evento y los cinco encabezados de transmisión. No se descarga el certificado indicado por un encabezado del remitente.
- Webhook usado como aviso para volver a consultar la orden; no se toma su importe o estado como única prueba. Eventos desconocidos o de órdenes no locales no publican nada.
- Idempotencia de creación/captura y transición PAID bajo bloqueo SQL. Reintento de creación incierta conserva la misma clave y orden, solo durante cinco horas; fuera de esa ventana exige conciliación y no crea otro pedido. PayPal documenta retención estándar de seis horas para las claves de creación: https://developer.paypal.com/sdk/orders/v2/orders-create/.
- Si publicación falla después de persistir PAID, el pago se conserva y se reintenta publicación mediante nueva consulta o webhook; respuesta 503 indica publicación pendiente.
- Premium y Premium Pro reutilizan `activatePaid` y el publicador canónico. Corregido el filtro que solo admitía Premium: ahora acepta ambos planes en DRAFT/PAYMENT_PENDING después de comprobar el pago. Se conservan revisión por riesgo, duplicados y suspensión.
- Residencial mantiene su precio y preparación existentes, pero se excluye de las rutas y pantalla PayPal; el publicador sigue rechazando su publicación hasta autorización comercial.

## Rutas

| Método | Ruta | Protección / función |
|---|---|---|
| GET | `/v1/user/requests/:addressId/paypal` | Sesión y propiedad, cotización |
| POST | `/v1/user/requests/:addressId/paypal` | Sesión, origen exacto, JSON vacío, `idempotency-key`; crear/reanudar orden |
| GET | `/v1/user/paypal/orders/:orderId` | Sesión, propiedad y consulta al proveedor; no captura fondos |
| POST | `/v1/user/paypal/orders/:orderId/capture` | Sesión, origen exacto, JSON vacío; captura y confirmación del proveedor |
| POST | `/v1/payments/paypal/webhook` | Firma verificada por PayPal, consulta backend y correlación con orden local; no exige sesión del comprador |
| GET | `/panel/payments/:addressId` | Pantalla Sandbox solo en aceptación habilitada; el flujo Yappy anterior se conserva cuando Sandbox está apagado |
| GET | `/panel/paypal/:orderId` | Retorno/cancelación, propiedad y consulta; el GET no confirma una captura |

## URL exacta del webhook preparado

**https://ad507-core-production.up.railway.app/v1/payments/paypal/webhook**

Corresponde al host Core existente referenciado por el repositorio. **No está desplegado ni se declara operativo.** Es una URL preparada, no evidencia de recepción de eventos. No debe habilitarse Sandbox en el servicio de cobros reales ni apagar Yappy para hacerlo funcionar. La aceptación real debe usar un entorno existente aislado y autorizado; si su dominio es diferente, la URL será ese origen HTTPS seguido de `/v1/payments/paypal/webhook`. No se creó otro entorno ni servicio para resolverlo.

En la aplicación **Sandbox** de PayPal, registrar el endpoint del entorno autorizado y suscribirse a `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED` y `PAYMENT.CAPTURE.DENIED`. Guardar el Webhook ID de esa misma aplicación, no uno Live ni de otro endpoint. La configuración no se ha hecho desde esta entrega.

## Variables necesarias

Plantilla sin credenciales: `core/runtime/paypal-sandbox.env.example`.

| Variable | Valor requerido |
|---|---|
| `AD507_PAYPAL_SANDBOX_ENABLED` | `true` únicamente después de autorización y configuración de aceptación; plantilla `false` |
| `AD507_PAYPAL_SANDBOX_ISOLATED` | `true` solo después de comprobar DB/entorno de aceptación aislados; plantilla `false` |
| `AD507_PAYPAL_ENVIRONMENT` | `test`; rechaza producción |
| `AD507_PAYPAL_ORIGIN` | Origen HTTPS exacto del entorno existente autorizado, sin ruta, credenciales ni query |
| `AD507_PAYPAL_CLIENT_ID` | Client ID de la aplicación Sandbox |
| `AD507_PAYPAL_CLIENT_SECRET` | Secret de esa aplicación, solo en gestor seguro de variables |
| `AD507_PAYPAL_MERCHANT_ID` | Merchant ID del comercio receptor Sandbox, no Client ID ni correo |
| `AD507_PAYPAL_WEBHOOK_ID` | ID del webhook registrado en esa aplicación Sandbox |

El arranque exige además el flujo comercial existente y los tres índices únicos de `schema-proposals/paypal.sql`, comprobados en lectura. No ejecuta DDL. `payments.sql`/`paypal.sql` son propuestas existentes, no migraciones aplicadas aquí: revisar esquema y respaldo y obtener autorización antes de cualquier aplicación remota.

El gate rechaza Sandbox si `AD507_YAPPY_PAYMENTS_ENABLED=true`; no cambiar esa variable en el servicio real. Credenciales por sí solas no activan PayPal. Todos los accesos API del adaptador permanecen fijados a `api-m.sandbox.paypal.com`; PayPal Live no está implementado ni habilitado.

## Pruebas verificadas

[CI 42085643043](https://github.com/direcciones507/direcciones507/actions/runs/42085643043), commit exacto `1e8d726`: **SUCCESS**.

- 20 pruebas específicas aprobadas, cero fallidas; una de concurrencia nativa omitida en la ejecución WASM por diseño.
- Cinco pruebas PostgreSQL nativo aprobadas, cero fallidas: ambos planes publican con el publicador existente, propiedad/históricos/Residencial, reintentos, webhooks, recuperación tras fallo de publicación y concurrencia con conexiones distintas.
- Tres recorridos Chromium (390/820/1440): aprobación simulada, captura, consulta repetida y cancelación sin activar pago; cero errores JS/desbordamientos. Capturas locales inspeccionadas y guardadas.
- Build del servidor y validación de las seis migraciones versionadas aprobados. Ningún archivo SQL modificado.
- Regresión amplia local, excluyendo el archivo consolidado que necesita PostgreSQL nativo: 191 aprobadas, tres omitidas y **cuatro fallos preexistentes**. En worktree limpio de la base: 182 aprobadas, dos omitidas y los mismos cuatro fallos. Son requisitos de DB local en Natalie/arranque de solo lectura y aserciones anteriores de Open Graph Premium/presentación. No se modificaron esos módulos ni se declararon aprobadas esas pruebas.
- La suite consolidada nativa completa no queda certificada: el clúster local embebido no puede crear usuario en este entorno. La nueva suite crítica sí se ejecutó con PostgreSQL nativo en CI.

Los dos primeros CI fallaron en preparación de fixtures nativos (conexión reservada y serialización JSON del controlador), corregidos antes del CI final. El primer recorrido local de cancelación agotó el límite por reutilizar una cuenta sintética en los tres tamaños; se corrigió el aislamiento de los usuarios de prueba sin debilitar el límite del producto.

**PayPal es simulado en todas estas pruebas**, incluyendo sus endpoints de verificación de firma. PostgreSQL nativo sí es real, aislado en CI. Los recorridos visuales simulan también el repositorio; no son dispositivos físicos ni pagos reales en la plataforma Sandbox de PayPal. Las variables PayPal necesarias no están configuradas en el entorno local disponible; no se usaron credenciales de otros proyectos ni se consultaron sus secretos.

Evidencias: `docs/evidence/paypal-sandbox-20261105/`, resúmenes locales/base/nativo, JSON y capturas.

## Bloqueos reales del propietario

1. Configurar por canal seguro las credenciales y el receptor Sandbox, y confirmar un entorno de aceptación **existente, aislado y autorizado** sin afectar Yappy. No se creó infraestructura.
2. Autorizar despliegue de esta rama en ese entorno. Si falta esquema, revisar respaldo y autorizar separadamente las propuestas existentes; no aplicar a producción por esta entrega.
3. Registrar la URL correcta y aportar su Webhook ID mediante variables seguras. Completar comprador Sandbox diferente del comercio, aprobación/captura reales, recepción de evento firmado y publicación en aceptación.

Sin despliegue, cambios Railway, migraciones productivas, cobros reales, cambios de precios, datos históricos ni modificaciones a Mi Contacto/Empleos.pa u otros proyectos.

Referencias oficiales: https://developer.paypal.com/api/rest/webhooks/rest/ y https://developer.paypal.com/api/rest/integration/orders-api.

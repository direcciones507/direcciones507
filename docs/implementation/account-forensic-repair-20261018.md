# Mi cuenta — reparación forense, 18 octubre 2026

Estado: probado en entorno aislado; despliegue y aceptación privada pendientes.

## Causa demostrada
98e99a7a575a672e6a8c44dc4e443d8d0b9c53cc (18:14:31 UTC), inmediatamente posterior a 41c78bf, truncó assets/legal-consent.js al rediseñar cookies: eliminó el montaje final, registro global, llamada inicial y cierres de mount/IIFE. user-panel.ts incorpora ese texto antes de su bootstrap dentro del mismo script. El JavaScript final de producción c3c1f61 falla con SyntaxError: Unexpected end of input. Reproducido tanto con node:vm como en Chrome real. No es un fallo de cookie de sesión, consulta SQL ni del proveedor Yappy.

La revisión de 9748da4/41c78bf no muestra ese truncamiento: sus cambios son copy/pago en detalle. 32eca633 corrigió Mi cuenta; fcbf0896 quitó el redirect anónimo; 5019289/4d7499c pusieron timeout/mensajes. bb3a8ea/6c42f72 añadieron bootstrap alternativo y c3c1f61 separó detalle: ninguno restauró el archivo truncado. El bootstrap alternativo explica correo visible sin controles.

## Corrección mínima
Restaurar solo el final original de cookies, conservando diseño. Eliminar consulta/recuperación alternativa que simulaba un panel incompleto. Plan507Continue dirige al panel compartido con country/origin/selectedPlan. El botón Google del panel conserva plan/origen en el sessionStorage ya utilizado antes del retorno OAuth. No cambia general-auth.ts ni permisos.

## Pruebas
- Parseo del archivo cookie y todos los scripts finales: panel507, panelLATAM, comercial507/LATAM, ADMIN.
- API aislada: 200 con registro propio, 401 sin sesión, 503 controlado; /panel y /panel/ anónimos 200 sin Location.
- Chromium real, respuestas sintéticas y CSP del handler: 9 escenarios 390x844, 820x1180, 1440x1000; sesión/401/503, ausencia de spinner permanente o salto a raíz, selección Pro, solicitud existente, Ver detalle, enlace Yappy, cierre/reapertura, tres planes Negocio.
- Ida a Google/retorno simulados para verificar persistencia de plan/origen. Esto no equivale a autenticación Google real.
- Prueba permanente específica y workflow en pushes main/PR, incluyendo cambios del asset externo que antes no disparaban compatibilidad.
- Producción autenticada: requiere sesión privada del propietario para Google completo y solicitudes/fotos reales. No se crean identidades ni datos productivos sintéticos.

## Protecciones
Sin SQL, cambios de R2, datos, códigos, QR, históricos, PayPal, credenciales o activación de cobros. El enlace Yappy se prueba sin visitarlo ni iniciar cobros. IPN/seguridad/idempotencia se revisan después del cierre del incidente; no se certifican por estas pruebas.

## Preparación Yappy conservada tras reparar Mi cuenta
Revisión de código existente (sin transacciones externas): firma HMAC con timingSafeEqual, dominio exacto y parámetros únicos; orden registrada por backend, precio/moneda de servidor, bloqueo FOR UPDATE y estados repetidos sin nueva confirmación. activatePaid mueve DRAFT/PAYMENT_PENDING a PENDING_REVIEW/PAYMENT_CONFIRMED y el camino manual de publicación exige APPROVED. No se activa publicación automática ni se modifica PayPal.
El test integrado de pago se actualiza para comprobar dos IPN válidos consecutivos, un solo evento de confirmación, cero publicaciones antes de ADMIN y publicación después de aprobación. Las credenciales aparecen configuradas por nombre en Railway; OAuth no permite leer sus valores. Esto no certifica credenciales, UAT del proveedor ni cobros reales.
Pendiente antes de habilitar: UAT con proveedor, conciliación de fallos inciertos, entrega/reintentos de IPN tras estados posteriores y aceptación privada del panel. Cobros reales no autorizados en esta intervención.

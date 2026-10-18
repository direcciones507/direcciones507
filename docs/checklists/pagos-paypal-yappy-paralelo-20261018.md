# DIRECCIONES 507/LATAM | PayPal + Yappy en paralelo

**Fecha:** 2026-10-18  
**Estado:** APROBADO PARA PREPARACIÓN. NO ACTIVAR COBROS REALES.  
**Rama:** feat/payments-parallel-preparation-20261018  
**Core:** único multinacional, sin pasarelas paralelas por país.

## Estado verificado en main
- `payment-policy.ts`: precios propiedad del servidor; `YAPPY_PAYMENTS_ENABLED=false`.
- `payment-routes.ts`: rutas de cotización, inicio, consulta e IPN Yappy con verificación backend, actualmente bloqueadas.
- `yappy-provider.ts`: adaptador test/production ya existente; no reconstruir.
- `payment-ui.ts`: pantalla Yappy ya existente.
- `paypal-provider.ts`: adaptador PayPal **solo Sandbox**, `PAYPAL_PAYMENTS_ENABLED=false`; no conexión pública en `server.ts`.
- `payment-repository.ts`: órdenes/auditoría y funciones PayPal Sandbox preparadas.
- `schema-proposals/payments.sql` y `paypal.sql`: propuestas; no aplicar DDL sin revisión/backup/autorización.
- PR #102 fusionado: aceptación legal y reglas de activación pagada verificada.
- PR #101 abierto: entrega, vencimientos y renovaciones; coordinar, no duplicar.

## 1. Base compartida
- [ ] Revisar contratos reales de precios, promociones y vigencia por país y plan contra la autoridad comercial actual, sin modificar importes por suposición.
- [ ] Definir selección de proveedor por país y plan; no ofrecer Yappy fuera de Panamá.
- [ ] Crear contrato común de cotización, orden, estado, conciliación y activación, reutilizando repositorio y auditoría existentes.
- [ ] Mantener pagos separados de solicitudes gratuitas: Negocio Gratis y Lugar Gratis sin pantalla de cobro.
- [ ] Conservar solicitud pagada en estado pendiente hasta confirmación autenticada del proveedor.
- [ ] Evitar cobros duplicados mediante idempotencia, bloqueo transaccional y conciliación tras errores inciertos.
- [ ] Mostrar importes, moneda, proveedor y resultado de manera clara, sin inventar descuentos.

## 2. Yappy Panamá
- [ ] Reutilizar `yappy-provider.ts`, `payment-routes.ts`, `payment-ui.ts` y `verifyYappyIPN`.
- [ ] Conectar proveedor al runtime mediante compuerta de habilitación independiente, inicialmente cerrada.
- [ ] Confirmar contrato y credenciales del comercio por canal seguro; no guardar secretos en GitHub.
- [ ] Completar Sandbox/UAT: creación, notificación válida/inválida, consulta, cancelación y reintentos.
- [ ] Confirmar que un evento del navegador nunca equivale a pago verificado.
- [ ] Preparar activación productiva por separado, solo con autorización expresa.

## 3. PayPal multinacional
- [ ] Reutilizar adaptador Sandbox y funciones del repositorio, sin sustituir Yappy.
- [ ] Completar rutas autenticadas de crear orden, aprobación/captura y consulta del estado.
- [ ] Verificar firma/autenticidad de webhooks o consultar confirmación directamente al proveedor según contrato soportado.
- [ ] Validar monto USD, divisa, comercio receptor, ID de orden y vinculación a la solicitud antes de activar.
- [ ] Probar Sandbox con aprobaciones, fallos, cancelaciones, duplicados y captura incierta.
- [ ] Confirmar elegibilidad, países admitidos, liquidación y condiciones reales de la cuenta comercial antes de producción.
- [ ] Implementar configuración de producción separada del Sandbox, con compuerta inicialmente cerrada.

## 4. Activación comercial y entrega
- [ ] Conectar el evento de pago confirmado con la activación autorizada de planes pagados, sin omitir controles antifraude/duplicados.
- [ ] Integrar con PR #101 para código, URL, QR, correo, inicio/vencimiento y renovación; evitar reconstrucción.
- [ ] Mantener código personalizado, URL y QR indefinidamente aunque venza el beneficio pagado, según reglas aprobadas.
- [ ] No modificar direcciones históricas, Apps Script, Excel, OWNER/PIN ni fichas públicas existentes.

## 5. Seguridad, pruebas y lanzamiento
- [ ] Probar por proveedor con credenciales de prueba y base aislada.
- [ ] Revisar esquema/migraciones, respaldo y rollback antes de cualquier SQL productivo.
- [ ] Comprobar permisos, privacidad, idempotencia, firmas, importes, reembolsos y conciliación.
- [ ] Verificar presentación en móvil/tablet/escritorio y ambos dominios.
- [ ] CI verde, revisión, despliegue y comprobación en producción con proveedores DESACTIVADOS.
- [ ] Autorizar habilitación de Yappy y PayPal **individualmente**, después de validar el circuito real de cada uno.

## Prohibiciones de esta preparación
No activar cobros reales; no escribir secretos ni datos de tarjetas en GitHub; no alterar precios o promociones sin cotejo; no aplicar DDL productivo; no habilitar PayPal producción usando configuración Sandbox; no cambiar ni reasignar códigos/URL/QR históricos.

## Criterio de terminado
Ambas integraciones están construidas, auditables y comprobadas en entornos de prueba, con interruptores independientes apagados. El lanzamiento de cada pasarela requiere autorización posterior y evidencia de transacción verificada. **Este checklist no afirma que ya estén conectadas.**

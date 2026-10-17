# Direcciones 507/LATAM — automatización del Core (PR #101)

Estado: implementación en rama; NO OPERATIVO. Sin despliegue, SQL productivo ni envíos reales.

## Arquitectura y límites

Un solo Core y PostgreSQL para los ocho países configurados. Reutiliza addresses,
ownership, orders, audit_log, el adaptador account-email y la verificación Yappy
por firma existente. No se crean paneles, generadores ni bases nacionales.
No modifica Excel, Apps Script, Pages ni fichas históricas. No backfill.

Publicación ADMIN: tras aprobación y pago confirmado si corresponde, la misma
transacción que activa la dirección crea el período y un mensaje pendiente. El
correo se envía después, desde un worker, y sus fallos no revierten publicación.
Solo se entrega al OWNER activo de la cuenta, no al correo de contacto escrito en
la ficha. Los residenciales e importaciones quedan excluidos: no se exponen
ubicaciones privadas, tokens OWNER ni enlaces temporales en mensajes públicos.

La identidad (código/URL/QR) no cambia al vencer o renovar. Una reserva SQL
permanente impide cambiar/borrar/reasignar identidades que entran a este flujo.
El plan comprado permanece en addresses: la vista de beneficios se calcula al
leer, sin convertir el código nominal a numérico. No hay barrido de históricos.

## Esquema propuesto, nunca automático

`core/runtime/schema-proposals/plan-lifecycle.sql` requiere requests, countries,
payments y paypal. Agrega períodos, intenciones de renovación, outbox y reservas.
Reutiliza orders; reemplaza la unicidad de dirección/entorno por unicidad de
intención PENDING para permitir períodos sucesivos. Órdenes anteriores siguen
íntegras. payment_plan/environment/provider_order_id/operation_key/confirmed_at
son prerrequisitos; no basta añadir una sola columna.

Antes de producción: inspeccionar information_schema, constraints, índices y
ad507.schema_migrations; revisar el diff de este SQL; asignar versión/checksum en
un release autorizado; respaldo recuperable; ensayo en restauración aislada;
autorización expresa y postcondiciones. Este archivo no entra al startup ni al
runner de migraciones actuales. Reaplicación debe fallar para exigir revisión.
No usar rollback que borre períodos, intenciones, identidades o outbox con datos.

## Configuración necesaria

| Configuración | Función |
|---|---|
| `AD507_PLAN_AUTOMATION_ENABLED=true` | Conecta períodos a publicación y API ADMIN/renovación, junto con AD507_COMMERCIAL_WORKFLOW_ENABLED=true. Omitida por defecto. Habilitar solo después del SQL autorizado. |
| `AD507_PLAN_PERIODS_JSON` | Días por país y plan, por ejemplo `{"PA:BUSINESS_PREMIUM":30,"PA:BUSINESS_PREMIUM_PRO":30}`. EJEMPLO de prueba, no duración comercial aprobada. Entre 1 y 3660 días. Sin entrada válida se rechaza publicación pagada/renovación. |
| `AD507_PLAN_EMAIL_ENABLED=true` | Permite consumir outbox. Omitida por defecto. |
| `EMAIL_FROM=soporte@direcciones507.com` | Remitente obligatorio para esta automatización. Crear/verificar antes de habilitar. |
| `RESEND_API_KEY` | Adaptador existente; configurar como secreto, nunca en repositorio. |
| `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_SECRET` | Alternativa existente al proveedor directo, HTTPS. |
| `AD507_EMAIL_WEBHOOK_IDEMPOTENT=true` | Obligatorio si se usa relay: debe implementar Idempotency-Key persistente y devolver `{id:string}` solo al aceptar. |
| `DATABASE_URL` | La misma base del Core; no incluirla en logs/documentos. |

Crear la cuenta de soporte no acredita por sí solo entrega desde Resend/relay.
Verificar dominio remitente, SPF/DKIM/DMARC y probar recepción real (bandeja/spam).
El estado SENT significa aceptado por el proveedor; no certifica entrega en la
bandeja. Revisar rebotes/quejas/supresiones en el proveedor antes del lanzamiento.
No se implementa lector de correos entrantes ni se ejecutan instrucciones de email.

## Pagos y renovación

No hay cobros automáticos. La ruta de renovación exige OWNER activo, origen de la
misma web, aceptación explícita, período/versión/importe/moneda de la cotización y
clave de idempotencia. Reutiliza el botón/adaptador Yappy, sin inferir éxito del
navegador. Solo PA se admite en pagos actuales; no habilita comercio internacional.

YAPPY_PAYMENTS_ENABLED continúa false en payment-policy.ts. PAYPAL sigue como
preparación sandbox, sin checkout de renovación en producción. No se han activado
pasarelas. Probar contratos y confirmación real firmada, rechazo, retrasos y
reembolsos antes de autorizar su conexión. La renovación responde no disponible
mientras falta proveedor, aunque aparezca el enlace en Mi cuenta.

Un pago PAID confirmado por el servidor debe coincidir en pedido, propietario,
plan, importe, USD, entorno y referencia de proveedor registrada. Cada pedido
puede crear un solo período. El worker reconcilia confirmaciones repetidas tras
reinicios. Errores de propietario/pago en una intención no detienen las demás.

Política implementada: días exactos de 24 horas en UTC. Compra inicial empieza al
publicar; renovación anticipada amplía desde el vencimiento anterior, y renovación
vencida/revocada desde la confirmación procesada. No hay prorrateo automático.
Aprobar esta política, duración y textos comerciales antes de producción. No se
asume anualidad. Las fechas de correos usan zona del país (México: Ciudad de México
por defecto); Mi cuenta/ADMIN usan zona del dispositivo y almacenan UTC.

Los gratuitos y Lugares registran inicio y vencimiento NULL: esta entrega no
cambia promociones ni agrega vencimientos a planes gratuitos. Los períodos
previos no se inventan ni se migran. Una aceptación inicial ausente se registra
NULL; la nueva UI transmite aceptación y el servidor fecha el registro. Toda
renovación registra aceptación vinculada al pedido y versión en legal_acceptances.

## Worker y reintentos

Comando preparado (NO ejecutado en producción):

```sh
bun scripts/run-plan-automation.ts
```

Programar cada 5 minutos en el entorno del Core, después de autorización. No se
configuró ningún cron, servicio nuevo ni cargo en Railway. Un pase: hasta 100
renovaciones y 50 mensajes. Ajustar frecuencia con métricas de cola antes de escalar.

Avisos: D15 (entre 8–15 días), D7 (entre 2–7), D1 (últimas 24h) y vencimiento.
Se envía solo el aviso vigente cuando el worker recupera un retraso, sin disparar
los tres atrasados juntos. UNIQUE(período,tipo) evita duplicados. Una renovación
cancela notificaciones antiguas aún no enviadas cuando llegan al worker.

La cola usa SKIP LOCKED, lease de 2 minutos, timeout HTTP 10s, payload congelado y
clave estable por mensaje. Reintenta red, 429 y 5xx con backoff, hasta 10 intentos;
4xx permanentes quedan FAILED. Tras 23h desde el primer intento un resultado
ambiguo queda UNCERTAIN para conciliar con el proveedor antes de reintentar: la
idempotencia de Resend dura 24h. Nunca reencolar automáticamente fuera de ventana.
Cambios de titular/correo, cuenta desactivada o período revocado cancelan el envío.
No se registran tokens, direcciones de correo ni respuestas del proveedor en logs.

Referencias: https://resend.com/changelog/idempotency-keys y
https://github.com/soldair/node-qrcode (QR generado en Core, sin servicio externo).

## Vencimiento y seguridad

El cron no pone la dirección en SUSPENDED ni borra fotos. Los lectores comparan
la fecha en cada petición, y el estado del pedido protege contra reembolsos sin
esperar al worker. Al vencer Premium/Pro se ocultan redes, descripción Pro,
código postal y galería adicional; se conservan navegación/contacto básicos,
logo/primera foto, nombre/código/URL/QR. La descarga directa de fotos adicionales
se deniega. Se bloquea el editor de estos planes mientras sus beneficios están
vencidos; sus datos y medios se conservan para renovación. Un fallo del worker
no prolonga derechos. Desactivar el flag no borra vigencias ya registradas: las
restricciones de lectura siguen aplicándose a esos registros.

ADMIN: Estadísticas → Vigencias y renovaciones. Contadores, filtro de país/plan,
búsqueda por código, máximo 100 filas, total de coincidencias y fallos de correo.
Mi cuenta muestra inicio/vencimiento y enlace a renovación voluntaria. Los roles
y propiedad se vuelven a comprobar en PostgreSQL. Sin API pública para marcar PAID.

## Lista de activación pendiente

1. Revisar/autorizar duración y política de períodos por país/plan.
2. Revisar/autorizar y aplicar esquema completo tras respaldo/ensayo; verificar ledger.
3. Crear/verificar soporte y proveedor de salida; probar entrega y supresiones reales.
4. Validar y autorizar proveedor de pago real, callbacks firmados y renovaciones.
5. Revisar CI del SHA final; integrar/desplegar solo tras revisión del propietario.
6. Configurar flags, worker y alertas de FAILED/UNCERTAIN/antigüedad de cola.
7. Prueba real autorizada: aprobar/publicar → correo/código/URL/QR/Mi cuenta;
   vencimiento controlado sin cambiar identidad → renovación pagada → reactivación.
8. Aceptación física en tablet/móvil y ADMIN. Solo entonces declarar operativo.

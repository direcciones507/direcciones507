# Direcciones 507/LATAM | Entrega, vencimiento y renovación automáticos

Estado: **implementado en la rama del PR101 y probado en base aislada**, NO OPERATIVO hasta despliegue y pruebas reales. Configuración y dependencias: `docs/plan-automation-configuration-20261017.md`.
Repositorio: `direcciones507/direcciones507`. Un solo Core, panel y modelo multinacional; no modificar Apps Script, Excel, códigos ni URLs históricas.

## Objetivo
Que el propietario no tenga que controlar fechas de vencimiento manualmente. La plataforma debe entregar la dirección al cliente tras publicación y, cuando aplique, confirmación de pago; notificar antes de vencer; aplicar automáticamente las restricciones del plan vencido; y permitir renovación voluntaria sin perder código, URL ni QR.

## Flujo funcional
1. Solicitud → revisión y **aprobación manual del ADMIN** (obligatoria para toda dirección nueva) → asignación única de código → publicación en Core → enlace/QR.
2. Plan gratuito: no hay pago ni pantalla de cobro; publicar tras aprobación y entregar acceso al cliente.
3. Plan pagado: no activar derechos pagados por pulsar un botón ni por una redirección del navegador. Esperar evento de pago **verificado por servidor** del proveedor habilitado en el país, con firma y comprobación de importe, moneda, estado, pedido y no duplicidad. Si todavía no hay proveedor operativo, mantener pendiente y no simular cobro.
4. Entrega: correo con nombre de dirección, código, URL y QR (adjunto o enlace seguro), acceso a «Mi cuenta» y vigencia del plan. No incluir datos residenciales sensibles ni enlaces privados reutilizables en correos sin controles adecuados. Los fallos de correo no deben revertir publicación; reintentar con idempotencia y mostrar estado.
5. Registrar `starts_at`, `expires_at`, país, zona horaria de visualización, plan, período comprado, moneda, ID transacción, factura/comprobante y registro de aceptación. Los instantes persistidos en UTC; mostrar fecha local del cliente.
6. Notificaciones sugeridas **15, 7 y 1 días antes** del vencimiento y aviso de vencimiento. Cadencia confirmada en la solicitud de implementación del propietario. Evitar duplicados por dirección/período/tipo de aviso; respetar exclusión de mensajes promocionales. Mensajes transaccionales sobre el servicio deben distinguirse de marketing.
7. Al vencer: desactivar automáticamente funciones Premium/Premium Pro. Mantener dirección digital básica, código, URL y QR. No eliminar, no generar nuevo código, no cobrar, no renovar por defecto. Las direcciones residenciales siguen privadas por defecto. Los gratuitos no expiran salvo regla de promoción concreta y publicada.
8. Renovación voluntaria: el cliente confirma nuevo período y pago; tras verificación, reactivar funciones del plan. No crear otra dirección. La nueva fecha se calcula conforme a política publicada y pago confirmado; evitar doble extensión por webhooks repetidos.
9. ADMIN: lista y contadores de activos, próximos a vencer, vencidos, pendientes de pago, notificación fallida y renovados; filtros por país/plan/fecha, búsqueda por código, y auditoría de eventos. No exigir vigilancia diaria manual.
10. Ejecutar tarea programada con tolerancia a fallos, reintentos, concurrencia e idempotencia. La restricción de derechos también se debe calcular al consultar la dirección, para que un cron fallido nunca deje Premium activo después de `expires_at`.

## Estados orientativos
`pending_review` → `approved` → `pending_payment` (solo pago) → `active` → `expiring_soon` (estado derivado) → `expired_basic` → `active` tras renovación.

Distinguir **estado de solicitud**, **estado de publicación**, **estado de pago** y **estado de suscripción/entitlements**; no usar una única bandera ambigua.

## Seguridad y pruebas de aceptación
- Nunca activar sin aprobación ADMIN y, si es de pago, confirmación del proveedor.
- Pruebas de fecha exacta de vencimiento, cambio de mes/año, zona horaria, cobro rechazado, reembolso, webhook duplicado/fuera de orden, concurrencia, caídas de correo, reinicios del worker, cuenta borrada y dirección residencial privada.
- Probar URL/QR antes y después de vencer y tras renovar.
- No permitir que una dirección vencida use beneficios Premium aunque no corra el programador.
- Probar plantillas de correo con datos ficticios y enlace de renovación autenticado; no incluir secretos ni tokens permanentes.
- Migraciones SQL solo tras inspección de esquema actual, pruebas en base aislada, backup y autorización productiva expresa. Reutilizar tablas, jobs y proveedor de correo existentes cuando corresponda.

## Dependencias
- Inspeccionar implementación real del Core, panel, tablas y pagos antes de programar; no asumir que la ventana de pago implica pasarela operativa.
- Configurar y probar proveedor de correo saliente y dirección de soporte `soporte@direcciones507.com` cuando se cree.
- Acordar el período comercial de cada plan; avisos 15/7/1 confirmados.
- Registrar cada paso en checklist maestro y verificar **producción**, no solo CI verde.

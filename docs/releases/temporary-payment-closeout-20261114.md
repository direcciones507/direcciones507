# Dirección Temporal: cierre interno

## Alcance y operación

Se conserva la tarifa aprobada: US$12.99 para 1–30 días, US$19.99 para 31–60.
Las órdenes antiguas mantienen su importe. La paleta disponible es el diseño aprobado
que ya renderiza `temporary-event-design.ts`; no se añaden colores ni diseños nuevos.
El formulario identifica esta selección como `APPROVED`; el servidor rechaza otros valores.

Yappy conserva sus banderas, credenciales y restricción al evento de prueba existente.
Este cambio no amplía la habilitación comercial ni ejecuta pagos. Una redirección o
un evento del botón no confirma el pago: solo la IPN firmada del proveedor.
Se conserva la orden pendiente ante un timeout ambiguo y se registra el error sin reintentar el cobro.

Las confirmaciones, errores, activación y vencimiento quedan en `ad507.audit_log`.
La activación registra su instante y el vencimiento exacto; se conserva el día siguiente
completo después de `ends_on`, según la zona del evento. El proceso de vencimiento corre
cada minuto con la bandera existente de eventos. Las rutas públicas ya bloquean el
acceso después del corte aunque el proceso se retrase. No hay renovación automática.

Las notificaciones son internas de cuenta (`channel=ACCOUNT`, `status=AVAILABLE`),
idempotentes por orden y tipo; la consulta privada del dueño las devuelve.
No se añaden envíos de correo ni SMS ni se contacta con clientes durante las pruebas.

## Reembolsos

`POST /v1/user/temporary-events/:id/refund` permite al dueño registrar una solicitud
con `requestId` de 8–100 caracteres alfanuméricos, guion o subrayado.
La solicitud queda `PENDING_PROVIDER`, no inicia un reembolso ni retira beneficios.
Una única solicitud efectiva por orden evita duplicar operaciones.

`createTemporaryEventRefunds(sql, verifier)` contiene la liquidación interna: requiere
un verificador confiable del servidor que consulte/autentique al proveedor de forma
independiente. No existe ruta pública para confirmar ni un verificador configurado.
Debe coincidir la orden, transacción, entorno, importe completo, moneda y referencia.
Solo `CONFIRMED` retira beneficios, de forma transaccional e idempotente. Un reembolso
parcial o no confirmado no cancela el evento. La captura original se conserva `PAID`;
el asiento separado del historial representa el reembolso. Una IPN repetida no reactiva
el evento cancelado. La conexión con el proveedor permanece pendiente.

No se modifica el esquema ni se migran datos. Se usan tablas existentes. No hay DDL de arranque.

## Pagadito — pendiente de aprobación comercial, completamente inactivo

No existía adaptador Pagadito en el repositorio. `pagadito-preparation.ts` define solo
un punto de conexión desconectado. No se importa en el servidor, rutas o UI; no contiene
cliente HTTP, webhook, botón, cobro ni creación de órdenes/transacciones.
Su bandera predeterminada es falsa y el adaptador devuelve siempre `enabled:false`.
Ninguna variable puede activarlo en esta versión. No se han ejecutado pruebas de Pagadito.

Variables reservadas para la futura conexión (NO configurarlas ahora):

- `AD507_PAGADITO_ENABLED=false`: bandera de activación futura.
- `AD507_PAGADITO_ENVIRONMENT`: entorno que se apruebe después.
- `AD507_PAGADITO_UID`, `AD507_PAGADITO_WSK`: nombres locales propuestos para las
  credenciales; confirmar su correspondencia y requisitos con la documentación y
  credenciales oficiales que entregue Pagadito. No son una configuración operativa.

Después de la aprobación y una nueva autorización expresa del propietario:

1. Revisar el contrato y documentación oficial entregados por Pagadito: credenciales,
   autenticación, confirmación servidor a servidor, estados y reembolsos.
2. Implementar el adaptador con el sistema de órdenes existente, sin modificar órdenes previas.
   Asegurar vínculo con orden/transacción, importe/moneda, idempotencia e historial.
3. Configurar únicamente el entorno de pruebas autorizado y verificar confirmaciones
   y errores antes de considerar producción. Nunca confiar en una redirección.
4. Presentar resultados y obtener autorización expresa para configurar credenciales
   de producción, webhook y bandera. Habilitar solo entonces.

Este despliegue no configura ni activa Pagadito y no llama a ninguna de sus API.

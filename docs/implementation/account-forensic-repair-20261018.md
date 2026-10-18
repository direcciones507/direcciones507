# Mi cuenta — reparación forense, 18 octubre 2026

Estado: Mi cuenta operativo, desplegado y verificado con Google y solicitudes reales. Yappy conserva validación financiera pendiente.

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
- Producción autenticada verificada: el propietario seleccionó su cuenta mediante autenticación segura. Google volvió a /panel?country=PA&origin=507. Se cargaron cinco fichas reales, incluidas dos activas con estadísticas y tres solicitudes; se abrió Ver detalle con datos/logo y Pagar ahora con Yappy. El enlace de Premium Pro507 abrió el formulario real con Panamá, plan Pro y controles activos. Sin enviar formularios, modificar registros ni iniciar pago. No se incluyen identificadores personales en este informe.

## Protecciones
Sin SQL, cambios de R2, datos, códigos, QR, históricos, PayPal, credenciales o activación de cobros. El enlace Yappy se prueba sin visitarlo ni iniciar cobros. IPN/seguridad/idempotencia se revisan después del cierre del incidente; no se certifican por estas pruebas.

## Preparación Yappy conservada tras reparar Mi cuenta
Revisión de código existente (sin transacciones externas): firma HMAC con timingSafeEqual, dominio exacto y parámetros únicos; orden registrada por backend, precio/moneda de servidor, bloqueo FOR UPDATE y estados repetidos sin nueva confirmación. activatePaid mueve DRAFT/PAYMENT_PENDING a PENDING_REVIEW/PAYMENT_CONFIRMED y el camino manual de publicación exige APPROVED. No se activa publicación automática ni se modifica PayPal.
El test integrado de pago se actualiza para comprobar dos IPN válidos consecutivos, un solo evento de confirmación, cero publicaciones antes de ADMIN y publicación después de aprobación. Las credenciales aparecen configuradas por nombre en Railway; OAuth no permite leer sus valores. Esto no certifica credenciales, UAT del proveedor ni cobros reales.
Pendiente antes de habilitar: UAT con proveedor, conciliación de fallos inciertos, entrega/reintentos de IPN tras estados posteriores y aceptación privada del panel. Cobros reales no autorizados en esta intervención.

## Cierre de despliegue y pruebas
- PR #111: https://github.com/direcciones507/direcciones507/pull/111
- Commit principal: f5d30f2340c5f8e432eb13ee0d548e51d2801dc5.
- Railway: 53badc3f-4156-4dc7-a90f-9406cf06be7a SUCCESS, commit principal confirmado.
- CI completo 39158508802: 206 pass, 0 fail. Browser 39158508782, legal 39158509091, analytics 39158508772 SUCCESS.
- Browser en main 39158637082 SUCCESS; Pages desplegado. El JavaScript servido pasó node:vm y Chrome no volvió a registrar el error sintáctico.
- El IPN preexistente responde 400 a una consulta vacía; no se modifica su interruptor ni se afirma que esté deshabilitado. No se enviaron notificaciones firmadas ni cobros a producción.
- Alcance confirmado: recuperación de Mi cuenta completa. Pendiente financiero separado: UAT proveedor e idempotencia/conciliación tras estados posteriores antes de nuevos cobros reales.

## Continuación Yappy — PR #112
Commit integrado 1b3e81bd49cc6cce6c50757c054414bb0970e955, cambio funcional 61ed4ee4979126b65c07e8d104a0e23a9e6e22fb. activatePaid reconoce PAYMENT_CONFIRMED en estados posteriores como no-op: un IPN autenticado tardío no vuelve a publicar ni reactiva SUSPENDED/ARCHIVED/DISABLED. Prueba PostgreSQL: repetición antes y después de publicación ADMIN, y con suspensión, mantiene una auditoría de confirmación y una publicación. Los cuatro CI 39159601893/39159601921/39159601896/39159602001 terminaron SUCCESS. Sin notificaciones firmadas ni transacciones productivas.

Bloqueo productivo adicional demostrado al abrir el enlace de pago real, sin iniciar cobro: GET checkout devuelve Solicitud no disponible y GET cotización PAYMENT_OPERATION_FAILED. El log PostgreSQL a las 19:37:44 UTC identifica columna payment_environment inexistente en ad507.orders. Se reutiliza schema-proposals/payments.sql (cinco columnas, restricciones e índices), ya ejecutado únicamente en la prueba aislada. No se aplica DDL ni se activa funcionalmente un cobro con las variables preexistentes. Falta revisar estado/ledger/backup, aplicar el esquema bajo una compuerta de cobros cerrada y completar UAT del proveedor. Mi cuenta está operativo; Yappy no se declara listo para cobrar.

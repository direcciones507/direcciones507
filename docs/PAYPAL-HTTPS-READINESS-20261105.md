# PayPal Sandbox — verificación de infraestructura existente

5 noviembre 2026. Rama work/paypal-sandbox-20261105, HEAD d81e253093ce3bd95ed4ef0983e45c446b34ff2e; corrección CI c05b8482da6bf150612927aeb49b55dd1cd86634.

## Resultado verificable

CI de integración SUCCESS: https://github.com/direcciones507/direcciones507/actions/runs/42102717435 . Build, políticas Yappy, proveedor/rutas/checkout WASM, PostgreSQL 18 nativo y tres recorridos de navegador simulados aprobados.
CI OAuth Sandbox SUCCESS: https://github.com/direcciones507/direcciones507/actions/runs/42102717461 . Credenciales de GitHub aceptadas por PayPal Sandbox; esto no verifica titularidad del Merchant ID, capturas ni eventos firmados. No pedir volver a configurar esos secretos.

Código existente conserva creación/captura idempotentes, verificación mediante API PayPal, correlación local, USD/importe/comercio/pedido y publicación Premium/Premium Pro solo tras confirmación. Webhook exige cinco encabezados y verification_status SUCCESS de PayPal; no descarga certificados proporcionados por remitentes. Live sigue deshabilitado. Sin cambio funcional necesario demostrado en esta revisión.

## Bloqueo exacto de despliegue

Proyecto amused-enchantment 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d: solo entorno production 909fdec4-8930-4405-ae53-6e8fb0d3f901.
Servicio ad507-core b0da9f70-7790-4729-a728-aaa4aa3f571d: main, dominios públicos direcciones507.com/cuenta/direcciones.lat, variables de Yappy y DATABASE_URL; no es aceptación.
Shadow 02a71475-68d2-4590-b33c-7913e3f2bdd6: función Bun existente, solo production, DATABASE_URL y sin base de aceptación independiente verificada. No reutilizar su conexión por suposición ni sustituirlo sin autorización.

GET HTTPS real a https://ad507-core-production.up.railway.app/v1/payments/paypal/webhook respondió 404 ROUTE_DENIED. No es una URL operativa de Sandbox ni debe registrarse en PayPal. No se envió evento a producción ni se modificaron variables, servicios, DNS, esquemas o datos.

## Solución mínima propuesta — no ejecutada

Dentro del MISMO proyecto Railway: entorno paypal-acceptance con un servicio Bun de esta rama y PostgreSQL exclusivo, dominio temporal HTTPS. No clonar secretos de producción; configurar exclusivamente credenciales Sandbox, secreto de sesión propio y catálogo/datos sintéticos. PayPal Live false, Yappy false SOLO en aceptación. Aplicar esquema necesario SOLO a base nueva. Límites iniciales una réplica/0.25 vCPU/0.5 GB por servicio y ventana 48 horas, sujetos a autorización económica antes de crear recursos. No se han creado ni contratado.

Los secretos GitHub no se exportan ni se imprimen: para inyectarlos en aceptación se requiere un mecanismo seguro autorizado de despliegue (p. ej. workflow protegido con token limitado al entorno) o configuración privada directa en Railway. No equivalen a variables Railway ya disponibles.

## Paso de registro pendiente

No volver todavía a PayPal Developer. Primero aprobar aislamiento, desplegar y verificar endpoint real. Después registrar esa URL HTTPS exacta con los tres eventos ya elegidos y pulsar Save una sola vez; conservar el ID devuelto como AD507_PAYPAL_WEBHOOK_ID en el entorno Sandbox por canal seguro. No inventar ID ni usar uno Live. La comprobación de firma real y el ciclo completo con comprador Sandbox requieren este registro y pruebas posteriores; no están certificados ahora.

Yappy permanece intacto: solo lectura de configuración sin valores secretos, ningún despliegue productivo ni modificación de código/configuración Yappy o históricos.

Pruebas locales reejecutadas con Bun 1.4.0: 20 aprobadas, 1 omitida (concurrencia nativa sin URL de base local), 0 fallidas; 120 aserciones. La ejecución nativa está aprobada en el CI enlazado.

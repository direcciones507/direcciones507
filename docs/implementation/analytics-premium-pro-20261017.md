# Estadísticas en tarjetas — PR #103

Implementación sobre la rama existente. Sin SQL productivo aplicado ni despliegue de esta ampliación.

## Reutilización

Mismo panel, renderer de tarjeta, autenticación, propiedad `address_ownership`, catálogo y niveles BASIC/STANDARD/ADVANCED. Se conserva la tabla `ad507.ad507_business_analytics_events`, su índice por código/fecha y su índice único de idempotencia. Sin contadores paralelos ni cambios en Excel, Apps Script, plantilla histórica, códigos/URLs/QR, OWNER, publicación/activación o pagos. Lugar Gratis recibe el mismo nivel básico aprobado que Negocio Gratis.

## Resultado por plan

| Modalidad activa | Recuadro en cada tarjeta |
| --- | --- |
| Negocio Gratis / Lugar Gratis | Visitas registradas |
| Premium | Visitas e interacciones totales |
| Premium Pro | Totales y desplegable con acciones por tipo, gráficos separados de visitas e interacciones por día |

Período: últimos 30 días, calendario de Panamá. Solo registros reales; ausencia de registros se muestra como «Sin datos registrados». Error o falta de soporte de visitas se distingue como «Datos aún no disponibles». Los clics no se convierten en visitas. Las cifras no equivalen a personas únicas ni incluyen actividad sin consentimiento. No se muestran estadísticas residenciales, borradores ni pendientes de pago.

## Archivos

- `analytics-summary-view.ts`, `panel-address-card.ts`, `shared-visual-style.ts`: recuadro compacto claro, texto oscuro, cifras destacadas y desplegable Pro. Conserva botones existentes.
- `user-panel.ts`: carga privada por código con concurrencia máxima de tres, reintento y actualización al refrescar el panel.
- `analytics-repository.ts`, `server.ts`: consulta autorizada por propiedad, capacidades por plan, respuesta privada sin caché. Los eventos nuevos usan la ruta de ingestión existente; peticiones históricas siguen su handler original.
- `public-analytics.ts`, `new-address-publication.ts`: instrumentación discreta solo en render de fichas nuevas Core; usa el consentimiento existente. No edita la plantilla histórica. Visita, Maps, Waze, Uber, WhatsApp, llamada, compartir y apertura QR; no inventa clics de controles ausentes.
- `schema-proposals/analytics-visits.sql`: ampliación compatible del CHECK de eventos existente: acepta además `visit`, `whatsapp`, `call`, `qr`, preserva todos los valores previamente permitidos. No crea tablas ni borra registros; transacción, límites de bloqueo/ejecución y repetición segura. Nunca se ejecuta al arrancar.
- `tests/analytics-*.test.ts`: seguridad, persistencia real aislada, plan, deduplicación concurrente, repetición SQL y compatibilidad histórica.
- `scripts/analytics-browser.cjs`, `prepare-legal-browser.ts`, workflow `analytics-validation.yml`: tarjetas de cuatro planes en ambos dominios simulados y tres tamaños, capturas y resultado JSON. Datos de pantalla sintéticos señalados como prueba; no son cifras productivas.

## Privacidad y antiinflado

Solo propietario o gestor vinculado mediante la propiedad existente. ADMIN no obtiene acceso por su rol. Se comprueba la propiedad antes y después de la consulta; planes gratuitos nunca reciben desglose o series en JSON. Registro público exclusivamente para fichas Core activas con recibo de publicación. No se registra actividad residencial.

La analítica opcional exige aceptación explícita del gestor existente. Se usa nonce aleatorio de pestaña en sessionStorage, sin identidad/IP persistida. El servidor deriva una clave única por código/evento/nonce/intervalo de 30 minutos; PostgreSQL elimina reintentos y recargas concurrentes. No identifica personas únicas ni garantiza inmunidad a bots que falsifiquen sesiones. Límites acotados en memoria por código, globales y por usuario. La retención del evento existente no se modifica.

## Puerta productiva concreta

El esquema histórico solo permite seis tipos de clic y prohíbe visitas. **Se requiere autorización expresa del SQL adjunto antes de aplicarlo a producción**, conforme al encargo del propietario. El acceso Railway OAuth disponible oculta valores de conexión: no se extraen ni se inventan credenciales. Hasta ejecutar y verificar ese SQL no se declara captura de visitas operativa ni se fusiona/despliega esta ampliación.

Después: integrar #103, observar Railway SUCCESS y comprobar con sesión real del propietario en Mi cuenta, ficha pública de prueba y consentimiento, lectura del evento y aislamiento de otra cuenta. Google indexación continúa pausada. CI y capturas simuladas no sustituyen esta comprobación.

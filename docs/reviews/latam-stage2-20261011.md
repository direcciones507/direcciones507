# Direcciones LATAM — etapa 2, PR52

## Estado y arquitectura

PR52 pasa a depender del HEAD revisado de PR51 (`a51e1d591ef1e34510246f7c659940f3bbfa30ee`), reutilizando exactamente sus módulos. PR51 sigue abierto y NO fue modificado, fusionado ni desplegado. La base de revisión de PR52 es feat/r2-storage-adapter-20261010; cuando PR51 se integre se deberá retargetear a la base de lanzamiento y comprobar la unión. No se activó producción, países extranjeros, secretos, DNS ni pagos. Esta etapa NO acredita operación comercial internacional.

Un solo ADMIN, autenticación Google/roles, user-panel/formulario, request-repository, órdenes/audit_log, publicador y R2. No nuevas tablas, infraestructura ni plantilla duplicada. Excel, Apps Script, PLANES44, legacy.ts, fichas históricas y ad507.template.html intactos.

## Funcionalidades conectadas

- Selector PA predeterminado y ocho países iniciales en el formulario compartido. ADMIN prepara solicitudes internacionales; ciudadanos no pueden enviarlas comercialmente. PE/EC reservados, no admitidos aún por el contrato de solicitudes.
- Etiquetas territoriales dinámicas; región, municipio, localidad, ciudad y sector opcionales, con longitud/tipo validado en servidor. Son texto libre, no catálogos oficiales verificados. Se mantienen referencia, coordenadas, horarios, teléfonos, email, redes, planes y medios existentes.
- Backend valida countryCode, usa su prefijo para números locales extranjeros y conserva la normalización Panamá y teléfonos explícitos internacionales. No aplica validación nacional exhaustiva de numeración en esta etapa.
- country_code de PostgreSQL y countryCode/territory en request_data; ADMIN recupera país/territorio. Hashes de reintentos Panamá anteriores sin los nuevos campos se conservan mediante normalización compatible. Mismos locks e índices de idempotencia y permisos.
- Fotografías/logos siguen usando request-media y R2 privado; no se cambió autorización, firma, transformación, cuotas ni claves existentes.
- Nuevas fichas comerciales, Panamá incluido, usan marca **Direcciones LATAM en azul arriba y abajo**. La adaptación modifica solo dos elementos de marca del template mantenido; importaciones históricas conservan marca original.
- URL propuesta PA: https://direcciones507.com/AD507-.../; otros países: https://direcciones.lat/AD[prefijo]-.../. El país/prefijo debe coincidir. PA nuevo obtiene URL canónica Panamá; históricas conservan originalUrl. No se generan URLs activas extranjeras; publicador/reservador y UI ADMIN bloquean publicación extranjera. Rutas internacionales/sitemap/CORS y DNS NO activados ni ampliados en esta etapa.
- Entradas comerciales /commercial/panama y /commercial/international reutilizan el mismo HTML, formularios y sesión. No hay redirecciones entre dominios no verificados; el despliegue y enlace público a estas entradas quedan pendientes.

## Migración aditiva preparada

core/runtime/schema-proposals/countries.sql se aplica DESPUÉS de landline.sql y requests.sql de PR51, por runner/ledger revisado, nunca al arrancar. Exige request_data y constraint original verificable; falla ante drift/reaplicación. Añade country_code DEFAULT PA, valida país/prefijo y consistencia JSON, mantiene UNIQUE(code), índice normalizado y hashes de solicitudes. No renumera códigos ni reescribe datos históricos. Nuevos prefijos permitidos por esquema PA/CO/CR/GT/SV/HN/NI/MX; PE/EC reservados, backend los mantiene deshabilitados.

core/runtime/schema-proposals/paypal.sql requiere payments.sql de PR51. Usa orders existentes, limita PAYPAL a test/USD, añade unicidad de operación/referencia y un único intent por dirección/entorno entre Yappy y PayPal. Rechaza conflictos existentes; no intenta arreglarlos ni aplica cambios automáticamente. Numeración definitiva posterior al cierre de propuestas PR51 y revisión real de ledger; no editar migraciones históricas. No SQL productivo ejecutado.

## Precios y pagos preparados, no activados

Moneda oficial USD, moneda local informativa en configuración. preparedCountryAmount delega precios PA a autoridad existente y rechaza extranjeros sin tarifa aprobada. informativeLocalAmount requiere una tasa explícita válida; no inventa tasas ni interviene en la orden. No feed de cambio ni conversiones mostradas sin fuente/fecha aprobadas.

PA: métodos previstos PayPal/Yappy; extranjeros: PayPal. YAPPY_PAYMENTS_ENABLED y PAYPAL_PAYMENTS_ENABLED siguen false. PayPal usa solo https://api-m.sandbox.paypal.com, sin host producción ni wiring HTTP. Configuración requiere opt-in sandbox, ambiente test y client/secret/merchant/webhook en servidor. No secretos en HTML.

PayPalSandboxProvider: OAuth servidor, creación/captura Orders v2 con PayPal-Request-Id estable y distinto por operación; relectura API del id/merchant/custom_id/importe USD/capture final. Aprobación o éxito de navegador no confirma pago. Firma de webhook se verifica contra API fija PayPal; no descarga URLs arbitrarias de certificados. Verificación de webhook preparada y probada con mocks: aún no se conecta listener ni procesamiento/auditoría de eventos reales.

PaymentRepository: preparePayPal/initializePayPal/confirmPayPal reutilizan orders, ownership, autoridad de precio y audit_log. Una sola intención; errores inciertos dejan marcador INITIALIZING para conciliación, no recrean cobros. Confirmación y reembolso total releídos del servidor son idempotentes y auditables; nunca cambian revisión, código o estado de dirección. Cancelar en navegador NO marca pago ni habilita otra intención. Reembolsos parciales, disputas, procesamiento de webhooks y conciliación operativa son trabajo de la siguiente fase antes de habilitar pagos. No endpoint/botón PayPal activo.

## Revisión oficial PayPal (11 octubre 2026)

Fuentes primarias:
- https://developer.paypal.com/api/orders/v2/orders-create
- https://developer.paypal.com/api/orders/v2/orders-capture
- https://developer.paypal.com/api/rest/reference/idempotency/
- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/api/webhooks/v1
- https://www.paypal.com/pa/business
- https://www.paypal.com/pa/business/paypal-business-fees (actualización 28 septiembre 2026).

La documentación respalda Orders v2, confirmación/captura servidor e idempotencia. Las comisiones publicadas para comercios PA incluyen 5.40% + USD0.30 para transacciones comerciales USD del cuadro general, incluidas transfronterizas en esa tabla. Retiro bancario USD PA publicado: 1%, mínimo USD15; posibles cargos bancarios adicionales. No es presupuesto contratado ni prueba de disponibilidad de la cuenta/banco de Jacinto. No se aseguró elegibilidad universal Visa/Mastercard ni compra sin cuenta. Se debe verificar cuenta Business del titular, restricciones/merchant capabilities, retiro/liquidación real al banco elegido, tarifas aplicables/contrato y elegibilidad Checkout por países. Ninguna consulta a cuenta ni prueba real PayPal realizada.

## Pruebas y checklist

- [x] Revisar HEAD, tres comentarios PR52 y estado PR51.
- [x] Selector, etiquetas, servidor, país y territorio en mecanismos existentes.
- [x] Normalización internacional sin prefijo 507 automático; regresión Panamá.
- [x] Marca LATAM azul, template único y preservación de históricos.
- [x] Propuestas aditivas país/prefijo, unicidad y órdenes sandbox.
- [x] Bloqueo extranjeros: envío ciudadano, reserva, publicación, pagos.
- [x] Dos entradas comerciales reutilizando formulario y autenticación.
- [x] Adaptador PayPal sandbox y ledger compartido sin cobros activos.
- [x] Pruebas locales 75 aprobadas, 0 fallidas, 520 aserciones; compilación servidor, preservación legacy y validación de seis migraciones históricas PASS.
- [ ] Integración completa PostgreSQL/HTTP y propuestas nuevas: resultado definitivo en Actions.
- [ ] PR51 integrado/autorizado y migraciones revisadas/aplicadas con autorización independiente.
- [ ] Cuenta/credenciales sandbox reales, captura y webhook reales PayPal; Yappy real y condiciones bancarias.
- [ ] Listener firmado y conciliación de eventos/refundos parciales/disputas antes de activar pagos.
- [ ] Compra/configuración/verificación direcciones.lat; rutas, sitemap y CORS internacionales.
- [ ] Catálogos territoriales, tarifas extranjeras y fuente de cambio informativo aprobados.
- [ ] Autorización posterior de merge/despliegue/activación progresiva.

La fixture histórica del test consolidado acredita explícitamente su contrato de publicación para que el caso compruebe aprobación/bridge/restauración. Antes detenía la prueba en el gate preventivo previo y fallaba también en PR51. No se cambió el gate ni el publicador productivo: sus pruebas fail-closed siguen vigentes.

> Actualización posterior del propietario, 2026-11-13: las fichas permanentes conservan acceso público básico al vencer los servicios. Las cuotas y la publicidad anual de US$161.89 están aprobadas. Las temporales conservan expiración específica. No migrar históricos durante este cierre. Las instrucciones anteriores que contradigan estas reglas quedan sustituidas; se conservan debajo para trazabilidad.

# Direcciones507 / Direcciones LATAM — Política de servicio, vencimiento, códigos y SEO
Fecha de aprobación comercial: 2026-11-13
Estado: REGLAS APROBADAS POR PROPIETARIO; IMPLEMENTACIÓN Y PRUEBAS PENDIENTES
Ámbito: exclusivamente nuevas contrataciones en el Core/PostgreSQL. No aplicar retroactivamente a históricos Excel ni a contratos previos.

## Principio contractual
Se vende un servicio de vigencia limitada, NO un código, URL, QR, estadísticas o indexación vitalicios. El código personalizado queda reservado internamente al titular al vencer, pero no concede acceso público ni servicios hasta una reactivación pagada. No existe Negocio Gratis para nuevas contrataciones ni como estado público de degradación.

## Precios y modalidades aprobadas
- Premium anual completo: USD 29.99, vigencia 12 meses desde la primera activación pagada.
- Premium Pro anual completo: USD 49.99, vigencia 12 meses desde la primera activación pagada.
- Premium en dos cuotas: USD 16.50 al inicio + USD 16.50 a los 30 días (USD 33.00 total).
- Premium Pro en dos cuotas: USD 27.50 al inicio + USD 27.50 a los 30 días (USD 55.00 total).
- Segunda cuota: 30 días desde el primer pago, más 5 días de gracia. Sin cobro automático sin autorización del cliente. Permitir adelanto.
- Premium con solo primera cuota y segunda impagada: beneficios Premium durante 6 meses contados desde el primer pago; nunca indexable mientras no regularice la anualidad.
- Premium Pro con solo primera cuota y segunda impagada: degradar a beneficios Premium tras 5 días de gracia; conservar servicio hasta completar 12 meses desde el primer pago; nunca indexable mientras no regularice la anualidad. No tratar USD 27.50 como anualidad Premium completa.
- Si se completa la segunda cuota dentro de plazo/gracia, mantener plan originalmente contratado e indexación elegible; si se regulariza tardíamente, definir tratamiento de la reactivación, sin extensión automática de la vigencia inicial.
- Residencial: USD 14.99, un pago por 12 meses, renovable manualmente; actualmente oculto para nuevas ventas.
- Temporal: pago único USD 12.99 por 1–30 días; USD 19.99 por 31–60 días cuando esté implementado; vence sin renovación automática.
- Publicidad Lugar: USD 14.99 por 30 días; propuesta anual USD 161.89 por 365 días, sujeto a implementación/verificación.
- Ningún pago parcial habilita indexación, incluso si el servicio reducido sigue activo.

## Estado público al vencer
- Bloquear desde servidor todas las rutas públicas de la ficha vencida y las rutas personalizadas/QR que conducen a ella: no revelar teléfono, ubicación, fotos ni estadísticas comerciales.
- QR físico permanece escaneable pero su URL resuelve a pantalla neutra de servicio no disponible, no a ficha operativa.
- Retirar URL de sitemap, responder con noindex en páginas neutras y retirar metadatos OG comerciales. Google puede tardar en desindexar; no prometer eliminación instantánea.
- El código y su vinculación con el titular permanecen reservados en PostgreSQL, no reasignables. Una renovación/reactivación pagada puede reabrir exactamente la URL/QR anteriores.
- El acceso a datos privados y las obligaciones legales de retención no se eliminan por vencimiento.
- No degradar a Negocio Gratis público. No crear un segundo código para reactivación.
- El vencimiento se valida en cada petición de servidor, no solo con cron ni ocultación CSS/JS.
- Estadísticas y funciones de pago quedan deshabilitadas al vencer; conservar registros internos de auditoría conforme a la política de datos.

## Protección histórica y migración
- Las direcciones históricas existentes, con sus condiciones adquiridas, códigos, URL y QR, NO se modifican retroactivamente por esta política.
- Migrar comerciales desde Excel/Apps Script a PostgreSQL una por una, luego lotes de cinco tras piloto exitoso; conservar código exacto, URL y QR; comparar ficha y verificar enlace antes/después.
- Respaldar y validar restauración antes de cambios; rollback individual. Mantener legado activo hasta que TODAS sus dependencias (incluidas residenciales) estén migradas o resueltas y verificadas. Desconectar Excel/Apps Script solo con aprobación final, nunca eliminar respaldo original sin autorización.
- Los contratos nuevos usarán exclusivamente la política de servicio de vigencia limitada.

## Checklist técnico de implementación
- [ ] Inventariar rutas, modelos, tablas, códigos, estados, renovaciones y referencias al Negocio Gratis.
- [ ] Crear matriz de compatibilidad entre contratos históricos y nuevos; versionar términos aceptados.
- [ ] Diseñar migración SQL reversible, respaldo y preflight de restricciones de códigos/URL/QR.
- [ ] Implementar estados de cuota 1, cuota 2, gracia, pago completo, degradado, vencido y reactivado con transiciones idempotentes.
- [ ] Verificar cotización backend por plan y cuotas; registrar vencimiento de cuota y vigencia por separado.
- [ ] Validar Yappy/IPN auténtico, conciliación, duplicados y reintentos; no cobrar en pruebas sin autorización.
- [ ] Restringir beneficios Premium Pro a Premium tras gracia sin segunda cuota; conservar vigencia 12 meses no indexable.
- [ ] Limitar Premium con cuota única a 6 meses no indexables.
- [ ] Aplicar noindex en HTML inicial desde primer pago parcial; indexar únicamente con anualidad completa, vigente y elegible.
- [ ] Retirar fichas vencidas del sitemap y servir pantalla neutra en URLs y destinos QR; reservar códigos sin reasignar.
- [ ] Probar expiración y reactivación con mismo código/URL/QR, sin fuga de datos ni estadísticas.
- [ ] Asegurar que no exista fallback público a Negocio Gratis para nuevas contrataciones.
- [ ] Pruebas: 30 días + 5 gracia, zona horaria, 6/12 meses, pagos anticipados/tardíos, IPN repetidos, vencimiento, SEO, OG, sitemap, móviles y regresión histórica.
- [ ] Actualizar Política Comercial, Términos, pantallas de compra, consentimiento y textos de renovación ANTES de vender con estas condiciones.
- [ ] Publicar solo tras CI verde, Railway SUCCESS y prueba end-to-end; informe de evidencias.
- [ ] Ejecutar piloto migratorio de una dirección comercial; después lotes de cinco con validación individual.
- [ ] Auditar dependencias del legado y autorizar desconexión únicamente tras cierre completo.

## Puntos por concretar antes del despliegue
- Definir tratamiento exacto de cuotas pagadas después del día 35 y su impacto en vigencia, sin regalar extensiones ni perjudicar derechos contractuales.
- Precisar cuándo se aplica la política a contratos nuevos y las condiciones comerciales por país.
- Revisar obligaciones legales de aviso y derechos adquiridos antes de sustituir textos vigentes.

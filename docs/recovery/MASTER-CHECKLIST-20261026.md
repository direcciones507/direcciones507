# CHECKLIST MAESTRO | Direcciones507 + Direcciones LATAM
Fecha: 2026-10-26. Estado: plan de trabajo, NO evidencia de implementación.
Repositorio: direcciones507/direcciones507
Rama de preparación: fix/custom-codes-safe-20261026

## Reglas innegociables
- No modificar main, gh-pages, producción, DNS, Railway, pagos reales ni ejecutar migraciones productivas.
- No abrir PR hasta confirmar que Railway PR Environments y otros despliegues automáticos no se activarán. No intentar reconectar Railway en bucle.
- Mantener intactos diseño, CSS, imágenes, tipografía, layout, estadísticas existentes y datos históricos.
- No reconstruir lo que ya funciona; primero reproducir fallo y dejar evidencia.
- Precios anuales VIGENTES: Residencial USD 12.99, Premium USD 19.99, Premium Pro USD 39.99. No sustituir por precios discutidos.
- Sistema nuevo Core/PostgreSQL para nuevas direcciones. Excel/Apps Script histórico no emite nuevas.
- Las aproximadamente 25 direcciones públicas históricas ya estaban protegidas. Verificar esa protección SIN migrarlas ahora, sin tratarlas como 2,004 clientes. El inventario de 2,004 rutas GitHub NO equivale a 2,004 direcciones activas.
- RESIDENCIAL y el formulario Residencial se trabajan AL FINAL, después de todas las demás funciones.

## Checklist ordenado
- [ ] 0. Línea base de seguridad: comparar rama y main, confirmar protecciones existentes de ~25 direcciones históricas, sin tocar las fichas ni publicar rutas antiguas. Inventariar únicamente enlaces realmente activos y códigos protegidos, con evidencia; no restaurar 2,004 rutas a ciegas.
- [ ] 1. Premium: validar/corregir nombres personalizados con prefijo del país, reserva única y no reemplazo silencioso por código numérico; enlaces, QR, compartir, panel y publicación.
- [ ] 2. Premium Pro: validar/corregir nombre exclusivo sin prefijo, URL raíz, redirección, QR, compartir, código interno, exclusividad global, rutas reservadas y protección de históricos.
- [ ] 3. Yappy: estaba funcionando. SOLO prueba de regresión con proveedor simulado o sandbox autorizado, incluyendo solicitud, retorno, confirmación, publicación, sin pagos reales ni cambios preventivos.
- [ ] 4. Estadísticas: Premium contador de visitas y clics (WhatsApp, Maps, Waze, Uber, llamada según botones); Pro incluye contador, totales, gráficos y filtros 7/30/90 días. Verificar propiedad, permisos y visual intacta.
- [ ] 5. Membresías y vigencia: fecha de inicio al publicar tras pago confirmado, vencimiento anual calendario, estado y seguimiento visible en Mi cuenta; idempotencia y no alterar contratos históricos.
- [ ] 6. Avisos de vencimiento y próximo cobro: avisos 15/7/1 días; diferenciar recordatorio de renovación manual de aviso de cargo automático, con fecha e importe claros. Canal, entregabilidad y auditoría pendientes de definir/verificar.
- [ ] 7. Renovaciones: permitir renovación manual; preservar código, URL y QR al vencer, suspender beneficios del plan según política aprobada. Renovación automática SOLO si el cliente autoriza expresamente cobros recurrentes por tarjeta, con cancelación sencilla, tokenización por proveedor (nunca almacenar PAN/CVV), consentimiento verificable y notificación previa. No asumir que Yappy soporta recurrencia. Confirmar proveedor, alcance y condiciones antes de implementar cobros; NUNCA activar cobros reales sin autorización adicional.
- [ ] 8. Publicidad banners en fichas LUGARES: revisar acuerdo histórico y especificación antes de código; precio $7.99/mes citado como propuesta, no asumir aprobación comercial final. Banner responsivo, imagen/enlace, vigencia, administración, clics/impresiones y ocultar cuando no haya campaña; respetar países con producto Lugares habilitado. Mantener visual actual hasta aprobación de cambio visual específico.
- [ ] 9. Direcciones temporales para eventos: producto separado e integrable luego; propuesta provisional $2.50 por 3 días, confirmar precio/duración; evento, fechas, mapa, Waze/Uber/WhatsApp, QR, expiración, privacidad y no confundir con enlaces temporales residenciales. Diseño/implementación tras estabilizar núcleo, antes de Residencial.
- [ ] 10. Pruebas integrales aisladas: PostgreSQL nativo descartable, concurrencia real de nombres, no colisiones, permisos, pagos simulados, vencimientos, regresión de fichas antiguas, móvil/tablet/escritorio; registrar resultados y bloqueos honestamente.
- [ ] 11. ÚLTIMO: Residencial, publicación y botón Revisar datos; verificar primero el fallo, corregir y probar sin tocar otros planes.

## Evidencia existente y límites
- Commit a44ed89 en rama de desarrollo: recuperación de códigos, alias Pro, propuesta SQL, pruebas y documentación. Feature flag AD507_CUSTOM_NAMES_ENABLED desactivado por defecto. No desplegado.
- Informe de rama: 289 pruebas aprobadas, 3 omitidas; no equivale a validación productiva. Faltan PostgreSQL nativo y conciliación histórica. No repetir como si fueran pruebas ejecutadas en esta sesión.
- Precios 12.99/19.99/39.99 confirmados por propietario; NO hay discrepancia de precios que corregir.
- PR aún no abierto por riesgo de entornos automáticos Railway.
- La rama feat/plan-expiry-renewal-20261017 contiene trabajo anterior de vigencia: inspeccionar antes de reimplementar y no mezclar a ciegas.

## Método de Work
Para cada casilla: (a) inspeccionar implementación y pruebas existentes; (b) clasificar funcional / fallo reproducido / no implementado; (c) hacer cambio mínimo en rama aislada, si es seguro; (d) ejecutar pruebas locales sin CI ni despliegue; (e) registrar evidencia, archivos y SHA; (f) dejar la casilla sin marcar hasta verificar. Informar bloqueos en vez de inferir éxito. No fusionar, desplegar ni modificar producción.

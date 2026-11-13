# Checklist de continuidad comercial — Direcciones507 / Direcciones LATAM

Fecha: 2026-11-13. Base de referencia: cierre comercial commit 35628c0. Este documento registra decisiones y pendientes, no certifica nuevas pruebas ni habilita cobros.

## Prioridades vigentes
- [ ] **P1 Dirección Temporal + Yappy Panamá:** inspeccionar flujo ya implementado; verificar borrador, vista previa, confirmación segura del proveedor, activación únicamente tras pago confirmado, expiración independiente y auditoría. Resolver desde las herramientas disponibles sin consumir créditos de Work cuando sea posible. No realizar pagos reales sin autorización específica.
- [ ] **P2 Pruebas técnicas Temporal:** verificar callbacks/webhooks, firma, idempotencia, órdenes y estados, errores, pruebas automatizadas y comportamiento en producción sin introducir despliegues riesgosos.
- [ ] **P3 Cobros de publicidad:** mantener deshabilitados hasta pruebas y autorización; comprobar activación y vigencia mensual/anual cuando se retome.
- [ ] **P4 Flujos técnicos de reembolsos:** las políticas, condiciones y precios YA están escritos/corregidos. NO reescribirlos ni reabrir decisiones comerciales. Pendiente: prueba auténtica sandbox, idempotencia, registro/conciliación, reversión exacta de beneficios, trazabilidad y mecanismo oficial Yappy. No habilitar reembolsos reales sin pruebas.
- [ ] **P5 PayPal LATAM:** aplazado por decisión del propietario; mantener cobros productivos deshabilitados.
- [ ] **P6 Dirección Residencial:** aplazada hasta recuperar créditos de Work; nuevas contrataciones cerradas.

## Completado según informe de cierre 2026-11-13
- [x] PR #261 y #262 fusionados; commit 35628c0.
- [x] Precios, cuotas, renovaciones manuales y vigencias implementados según cierre.
- [x] Políticas de reembolso y textos/precios comerciales redactados y corregidos; NO equivale a flujo de devolución operativo.

## Restricciones
- Mantener intactos Excel, Apps Script, códigos históricos y órdenes anteriores.
- No confundir políticas publicadas con procesamiento de reembolsos ya verificado.
- No efectuar pagos reales, habilitar pasarelas o desplegar cambios riesgosos sin autorización.
- Conservar una sola infraestructura compartida para Direcciones507 Panamá y Direcciones LATAM, con identidad de marca diferenciada.

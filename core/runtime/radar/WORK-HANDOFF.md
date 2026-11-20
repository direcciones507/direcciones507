# RADAR: entrega técnica a Work

## Corte vigente
20 de noviembre de 2026. Repositorio direcciones507/direcciones507; PR #325 en borrador, rama feature/radar-functional-2. PR #301 y #316 fusionados según #317. Último SHA de código con siete suites SUCCESS: ddb70dcbb45a76a4a73be08fc19d6064cc32e4ad. Antes de intervenir, consultar una sola vez el SHA vigente y sus validaciones. No repetir suites aprobadas salvo cambios relevantes. No fusionar ni desplegar.

## Conservar el trabajo comprobado
- Migraciones 0009–0021 y respaldo/restauración registrados como comprobados en #317. No repetir SQL ni respaldos ya aprobados; si el entorno difiere, comprobar ledger y detenerse ante divergencias.
- Autenticación y sesión CORE; formularios, administración central, verificación de propietarios y herramientas personales preparados. La CI usa datos sintéticos; queda pendiente aceptación con cuentas reales.
- Favicon, icono móvil, OpenGraph, canonical, robots, sitemap y datos estructurados preparados. La indexación permanece cerrada hasta autorización y aceptación. El usuario enviará el sitemap a Google y Bing.
- Protecciones de entrada JSON, sobrecarga de lectura pública, respuestas de error y cabeceras privadas verificadas por CI. Configuración Dependabot propuesta en rama, sin activación en main.
- Alertas se consultan dentro de Radar; no se certifican notificaciones externas. Reportes tienen vigencia de 30 minutos. GPS voluntario, no acredita presencia. Reputación privada.

## Trabajo todavía necesario
1. Auditoría compartida de seguridad: identidad, permisos, límites, dependencias, configuración GitHub/Railway/PostgreSQL y operaciones sensibles según #317. Revisar primero evidencia previa; no consultar valores de secretos ni alterar pagos, datos históricos o funciones ajenas. Mantener anónimos desactivados hasta su validación separada.
2. Rendimiento: utilizar #321 como registro único. Medir en entorno controlado, con escalones 50/100/200 usuarios, latencia, recursos, errores y consultas; contrastar límites y optimizar solo donde haya evidencia. No ejecutar carga contra producción.
3. Aceptación real: Google/correo, retorno a acción, dos cuentas separadas, propietario y ADMIN, formulación comercial, herramientas, dispositivos y regresiones de las tres plataformas. Coordinar con el usuario las verificaciones visuales y de acceso que hará personalmente.
4. Catálogo territorial: identificar una fuente existente y adecuada antes de ampliar las divisiones; no inventar datos. Mantener pendiente la redirección antigua hasta localizar una URL real.
5. Preparar informe de liberación con evidencia, rollback por gates, pendientes y decisiones. Usuario autoriza separadamente cualquier publicación, habilitación e indexación.

## Disciplina
No repetir trabajo comprobado, no esperar indefinidamente por procesos externos, máximo tres minutos acumulados de espera por ciclo. Consultar CI al finalizar y guardar continuidad en #317. Mantener detalles sensibles fuera de registros públicos. 

# Documento histórico de etapa 1

La etapa 2 de docs/reviews/latam-stage2-20261011.md sustituye las decisiones de marca, conexión y dependencia descritas aquí. La marca aprobada ahora es Direcciones LATAM arriba y abajo para fichas comerciales nuevas de todos los países.

# Direcciones Latinoamérica: arquitectura y primera etapa

## Alcance entregado

Base independiente: feat/admin-ui-20261006, 5a0682ba162f440639b3dd2db14430c712ad3c9a. No incorpora ni modifica PR #51. Tres archivos nuevos; ninguna ruta importa todavía el módulo. No despliegue, SQL ejecutado, DNS, credenciales, cobros ni cambios históricos.

Registro inmutable de países PA, CO, CR, GT, SV, HN, NI, MX; PE y EC reservados para futuro. Prioridad Panamá, luego Colombia/Costa Rica. Las prioridades NO constituyen autorización comercial: todos los países extranjeros tienen precios sin configurar y tarjetas deshabilitadas. Panamá delega a su autoridad existente, sin copiar ni alterar tarifas. No se conecta aún el selector ADMIN.

Plantilla única: adaptador preparatorio transforma exclusivamente el título visible DIRECCIONES/507. Conserva icono/logotipo, CSS, fotos, QR, botones, scripts y enlaces byte por byte. No modifica ad507.template.html. Falla ante cambios inesperados en el marcador. direcciones.lat queda como constante futura, no como destino de enlaces actuales.

## Reutilización y cambios mínimos

| Componente | Reutilización | Cambio posterior mínimo |
|---|---|---|
| ADMIN/autenticación | mismo panel, roles y sesiones | selector dentro del flujo existente; backend valida país permitido |
| Solicitudes comerciales PR51 | request-validation, request-repository, request-routes | countryCode PA por defecto; persistir ubicación en request_data y validar en servidor |
| Ubicación | coordenadas y referencia existentes | etiquetas por país; catálogos territoriales verificados antes de exigir divisiones; no cambiar Panamá |
| Teléfonos | prepareContacts existente | normalización específica: actualmente antepone 507 a números locales; no activar extranjeros antes de resolverlo |
| Plantilla/publicación | new-address-publication y ad507.template.html | aplicar título desde país persistido; ampliar rutas estrictas, API, CORS y sitemap coordinadamente |
| Códigos | UUID durable de PR51 | prefijo AD + código internacional + N/UUID, reserva única y controles de colisión existentes |
| Fotos/privacidad | mismo R2 y autorización propietario/estado | conservar claves existentes y controles; país no otorga permisos |
| Precios/pagos | autoridad Panamá y política de pagos PR51 | configuración servidor por país/moneda, versión de tarifa; nunca precios enviados por navegador |

El generador incluido propone códigos; NO reserva, publica ni cambia códigos existentes. PA coincide con formato PR51 AD507-N + UUID sin separadores. Prefijos extranjeros son distintos. Mantener UNIQUE(code), sin secuencias paralelas ni renumeración histórica.

## Migraciones necesarias antes de activar otro país

Etapa 1: ninguna. La restricción de db/migrations/0001_core_foundation.sql exige AD507. Para etapa posterior crear una migración nueva, después de la numeración final de PR51, sin editar migraciones aplicadas:

- country_code con PA por defecto y lista explícita de países; compatibilidad de lectores antiguos y validación país/prefijo para registros nuevos.
- Ampliar CHECK de code para prefijos permitidos, preservar todos los AD507 históricos, mantener unicidad global. Inspeccionar nombre real de constraint antes de redactar SQL final.
- Conservar códigos, URLs, propiedad, estados y datos históricos. No importar ni reescribir PLANES44.
- Ubicación nueva puede ir en request_data JSONB de PR51; no necesita tablas duplicadas. Catálogos completos son trabajo posterior.
- Tarifas nuevas versionadas pueden necesitar tabla aditiva país/moneda/plan; decidir tras condiciones comerciales. No convertir automáticamente las tarifas Panamá.

## Compatibilidad con PR51

Este PR parte de la base de lanzamiento y añade archivos únicos, sin tocar R2, pagos, publicación, autenticación ni tests de PR51. PR51 puede activarse independientemente. Después de su integración, actualizar esta rama y probar la unión antes de conectar configuración al runtime. No asumir que el módulo ya prepara todas las rutas para países extranjeros.

## Etapas y aceptación

1. Entregado: catálogo, prioridades, etiquetas preliminares, precios bloqueados, namespace propuesto y adaptación de título, sin runtime. Tests de inmutabilidad, país inválido, códigos, template y preservación Panamá.
2. Después del cierre PR51: selector ADMIN existente; countryCode PA por defecto y persistencia/validación; localización/teléfonos. Probar formularios Panamá sin cambios, rechazos extranjeros no autorizados, idempotencia, roles y límites de fotos.
3. Migración aislada con PostgreSQL: compatibilidad PA e históricos, unicidad concurrente, país/prefijo, rutas, publicación, QR, medios privados, sitemap y dominios. No activar DNS sin autorización. Probar restauración y lectura de históricos.
4. Colombia/Costa Rica: verificar divisiones territoriales y condiciones bancarias por entidad/país, moneda de cobro/liquidación, Visa/Mastercard, comisiones, impuestos, reembolsos, contracargos, PCI/3DS y webhook firmado. Elegir proveedor después de evidencia oficial y aprobación; no afirmar disponibilidad bancaria ahora. Configurar precios aprobados y sandbox, luego autorizar activación gradual. Otros países permanecen desactivados.

## Validación realizada

Bun 1.4.0: tests/country-configuration.test.ts, tests/panel-preparation.test.ts y tests/template-preparation.test.ts: 9 aprobadas, 0 fallidas, 129 aserciones. scripts/check-legacy.ts: PASS. No diagnósticos físicos R2 repetidos. Sin pruebas de países en producción ni afirmación de operación internacional completada.

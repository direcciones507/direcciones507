# Cierre funcional — inventario inicial, 12 octubre 2026

Base: feat/admin-ui-20261006, commit productivo 2b17793. Único PR abierto al inicio: #43 hacia main, sin autorización de integración. Core Railway SUCCESS. No se modifica producción.

| Prioridad | Función | Evidencia / pendiente | Acción ejecutable |
|---|---|---|---|
| 1 | Natalie LATAM | Homepage 200, botón disabled y script omitido. Backend crea sesión 200 desde PA y LATAM. URL HTTP interna reproduce el defecto de presentación; host público es HTTPS. | PR aislado: política de presentación por host exacto, con gate de dominio verificado y validación de protocolo/puerto/credenciales. API, widget y permisos intactos. |
| 2 | Natalie respuestas | PA: pregunta «¿Qué es AD507?» devuelve 200 y respuesta real. Pregunta «¿Qué es una dirección digital de Direcciones507?» devuelve 403 QUERY_OUT_OF_SCOPE_OR_FORBIDDEN en ambos orígenes. No afirmar conversación general completa. | Revisar filtro INFORMATIONAL y escapes; preservar FORBIDDEN y demás controles. Prueba de proveedor y mensajes aislada. |
| 3 | ADMIN | /admin existe en cuenta.direcciones507.com, HTML 200; session-check sin sesión 401. No hay apartado específico de Natalie en la navegación ADMIN existente. | Prueba autenticada con cuenta autorizada; no inventar permisos ni otro panel. |
| 4 | Agregar lugar | Formulario PLACE compartido existe, exige foto; entradas públicas no presentan acceso visible. AD507_COMMERCIAL_WORKFLOW_ENABLED no aparece en inventario de variables del Core, por tanto recepción pública del sistema nuevo está desactivada. | Reutilizar y verificar destino histórico antes de añadir CTA Panamá. CR permanece sin botón operativo; CO y demás países sin habilitar. No activar publicación/cobros. |
| 5 | Países | Ocho iniciales con etiquetas territoriales; assertCountryCommerce solo admite PA. Pruebas de navegación, formularios y separación de cookies aprobadas. | Prueba física de conservación del país en OAuth; estados de disponibilidad explícitos. |
| 6 | Planes | LATAM muestra nombres y acción preparar, sin beneficios/condiciones completos. Precios PA delegados a autoridad vigente; extranjeros sin tarifas. | Leer autoridad de planes aprobada; presentar detalle sin inventar tarifas ni cobrar. |
| 7 | Flujo comercial | Rutas preparación, revisión, publicación canónica, QR y entrega existentes. Gate comercial desactivado. No acreditado recorrido productivo nuevo completo. | Ensayo aislado con schema/fixtures existentes. Activación y migraciones requieren autorización separada. |
| 8 | Legal e identidad | Pendiente revisar documentos existentes y referencias oficiales PA/CR/CO; no publicar texto genérico ni incompleto. | Confirmar razón social exacta AD507 Technologies, domicilio/contacto responsable, conservación real, proveedores y contratación/renovación. |
| 9 | Visual | Panel cliente aprobado. Recuperación imagen grande/mapa reservada a Claude. | Sin cambios en esos archivos ni rediseño del cliente. Pulido después del funcionamiento. |

## Rutas reales
- Administración compartida: https://cuenta.direcciones507.com/admin
- Cliente: https://cuenta.direcciones507.com/panel
- Creación administrativa existente: https://cuenta.direcciones507.com/admin/create

## Verificación de esta corrección
26 pruebas aisladas de presentación Natalie, navegación comercial, países y preparación de formularios; 0 fallos. check-legacy PASS. Sesiones reales desde PA/LATAM 200; una respuesta real PA 200. Se omiten IDs de sesión y datos privados. No se modifican SQL, variables, DNS, credenciales, planes ni direcciones históricas.

## Dependencias de cierre
- Prueba ADMIN autenticada y funciones de revisión con cuenta autorizada.
- Columnas/migraciones comerciales y activación deben seguir el checklist existente, no repetirse aquí.
- La presencia de un formulario no prueba recepción productiva: conservar gate y no introducir enlaces a operaciones cerradas.
- Revisar límites del filtro informativo de Natalie antes de afirmar atención general.

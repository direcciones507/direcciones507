# Direcciones 507/LATAM — Entrega legal del 17 de octubre de 2026

PR de trabajo: #102. Fuentes y aprobación: #100. Checklist: #99.

**Estado: implementación preparada en rama, sin fusión ni despliegue.** Las cuatro políticas tienen rutas funcionales y el consentimiento ya no depende de un interruptor global que devuelva 503. «Legal operativo» requiere aprobación, despliegue autorizado y pruebas productivas posteriores.

## Correcciones ejecutadas

1. Se recuperaron y leyeron completos los cuatro PDF corregidos que el propietario aprobó el 17-oct, en lugar de volver a pedir sus datos. Sus transcripciones están en `docs/legal/fuentes-corregidas/`; no contienen números de identificación completos ni domicilio residencial. Se conservaron además las transcripciones originales del PR #100 para trazabilidad.
2. Se integraron los textos completos en `docs/legal/vigentes/` y `core/runtime/legal-content.json`. Se corrigieron las cláusulas dentro de cada documento, eliminando instrucciones de revisión, marcadores y contradicciones sobre navegación/aceptación, revisión universal ADMIN, menores, renovación automática, permanencia de código/URL/QR y privacidad residencial.
3. Versión del conjunto: **1.0-20261017**, con vigencia desde su publicación autorizada. No se inventa una fecha de despliegue. Cada documento y el conjunto tienen hash SHA-256, registrado con la aceptación para identificar el texto preciso.
4. Conservación: criterios del PDF aprobado por categoría y finalidad; no se inventan años de retención, borrado automático ni eliminación instantánea de respaldos. La permanencia del código no equivale a retener indefinidamente datos personales.
5. Proveedores: se describen servicios y funciones verificables en la implementación; no se atribuye una región concreta de alojamiento no comprobada.
6. Cuatro rutas GET/HEAD, con respuesta **200**, más historial y URLs de versión. Se genera la misma presentación para Core y GitHub Pages. Las políticas antiguas de los modales se sustituyeron por enlaces a los documentos completos.
7. Se reutiliza la casilla del formulario, obligatoria y desmarcada, con contraste y enlaces independientes. Se exige aceptación válida en el servidor; cookies opcionales y aceptación contractual son decisiones distintas. La auditoría conserva usuario, solicitud, país, versión, hash, texto y UTC del servidor. Un reintento no duplica la solicitud ni su aceptación.
8. El registro con correo valida la aceptación antes de llamar al autenticador existente. La pantalla de acceso con Google muestra los documentos y recoge la elección al crear cuenta; tras autenticarse se registra de forma idempotente en la auditoría existente. El formulario de dirección vuelve a exigir su propia aceptación. No se modifica el protocolo OAuth, las credenciales ni su módulo de autenticación.
9. Las cinco tarjetas del sistema compartido, las cuatro tarjetas actualmente presentes en la portada 507, sus diálogos y el pie enlazan las cuatro políticas. No se inventa una quinta tarjeta en 507 ni se reconstruye su diseño. Ambos gratuitos muestran revisión de hasta 48 horas desde el envío y ausencia de aprobación garantizada.
10. Cookies: no existía gestor reutilizable. Se añadió un único componente pequeño separado del contrato, sin exigir analítica. Google Analytics queda bloqueado hasta elección explícita, configurado con cookies de sesión; Tag Manager no se carga hasta verificar las etiquetas de su contenedor. Se puede rechazar o cambiar la elección sin bloquear las funciones esenciales.
11. Activación pagada: cambio aislado `0c7dbfc`. El cliente conserva sus datos preparados en DRAFT/PAYMENT_PENDING fuera de la bandeja ADMIN; un callback interno solo puede activar después de la verificación existente del proveedor y de la comprobación del pedido persistido. Se evita revisión rutinaria, con excepción auditable por duplicado/riesgo. Los gratuitos conservan aprobación manual. Los registros previos sin el nuevo estado siguen su flujo anterior. **Ninguna pasarela está habilitada por este cambio.**

## Antes y después

| Punto | Antes en #102 | Resultado propuesto |
| --- | --- | --- |
| Políticas | Documentos de revisión con marcadores; rutas 503 | Textos completos derivados de PDF corregidos y decisiones; rutas 200 |
| Envío | Rechazo global por documento de revisión | Aceptación de versión efectiva preparada, sin interruptor global |
| Evidencia | Solo ensayo del conjunto de revisión | Versión, hash, texto, UTC, usuario/solicitud y auditoría durable |
| Registro/OAuth | Enlaces parciales | Información completa, elección explícita para crear cuenta y registro al autenticarse |
| Gratuitos | Revisión manual; aviso incompleto | Se conserva revisión y se añade aviso en tarjetas, diálogo, formulario y detalle |
| Pagados nuevos | Entraban rutinariamente a revisión | Preparados privados hasta pago; hook de activación verificada y revisión excepcional |
| Residencial | Publicador público bloqueado | Protección conservada; no se convierte una vivienda en ficha pública |
| Analítica 507 | GA y GTM se cargaban de inmediato | GA solo tras aceptar; GTM no se carga sin inventario de sus etiquetas |

## Archivos y propósito

- `core/runtime/legal.ts`, `legal-content.json`: conjunto completo, validación de aceptación, hashes, rutas, presentación e historial.
- `core/runtime/legal-account.ts`: límite legal del registro y registro de aceptación de cuenta con el autenticador existente.
- `core/runtime/user-panel.ts`, `latam-presentation.ts`, `request-client-ui.ts`, `index.html`: enlaces, casillas, avisos y estados legibles; conservación de precios y textos promocionales existentes.
- `core/runtime/request-routes.ts`, `request-repository.ts`: aceptación antes de escritura y persistencia/auditoría, incluyendo reintentos y solicitudes previas.
- `core/runtime/paid-activation-policy.ts`, `payment-repository.ts`: clasificación y callback interno tras pago confirmado, sin habilitar proveedores.
- `core/runtime/server.ts`: integración de esas capas sin reemplazar autenticación, generador ni publicador.
- `assets/legal-consent.js`, `core/runtime/Dockerfile`: componente único de preferencias y empaquetado del recurso.
- `core/runtime/scripts/render-legal-review.ts`: mismo render para las rutas estáticas `/legal/*`, el historial y las vistas de evidencia. No se sirve la antigua carpeta de borradores.
- `core/runtime/scripts/prepare-legal-browser.ts`, `legal-browser.cjs`, `.github/workflows/legal-validation.yml`: revisión automatizada en navegador y capturas en tres tamaños.
- `core/runtime/tests/legal.test.ts`, `paid-activation-policy.test.ts`, `consolidated.test.ts`: documentos, aceptación, registro, persistencia, idempotencia y activación pagada aislada.
- `docs/legal/vigentes/*`, `fuentes-corregidas/*`, `legal/*`, `docs/legal/evidencia/*.html`: fuentes aprobadas, decisiones armonizadas, publicación estática y evidencia renderizada.

## Pruebas y evidencia

Pruebas ejecutadas localmente:
- Las rutas de los cuatro documentos en ambos dominios simulados devuelven 200 y HEAD sin cuerpo; soportan enlaces con versión.
- Rechazo de aceptación ausente, falsa, string y versión antigua. Fecha/texto/hash del servidor; analítica rechazada no impide aceptar el servicio.
- Cinco tarjetas compartidas con cuatro enlaces cada una; scripts de formularios y acceso compilan.
- Coincidencia de fuentes finales, hashes, render de Core y páginas estáticas.
- Registro sin aceptación bloqueado antes de autenticación; login y callback OAuth conservan su autenticador.
- Suite local sin PostgreSQL: 139 aprobadas y tres fallas por base local no disponible antes de añadir las dos pruebas de política pagada; las pruebas nuevas de política pagada también pasan. Resultado definitivo: consultar GitHub Actions del HEAD de #102.
- Build del servidor, validación de migraciones, check legacy y diff sin errores.

En CI se ejecutan con PostgreSQL aislado las pruebas de auditoría de cuenta y del flujo pagado: firma falsa no activa; pago verificado activa una vez; reintento no duplica; gratuitos requieren aprobación; duplicado va a revisión excepcional; la protección residencial impide publicación pública. La segunda comprobación usa navegador real en 390×844, 820×1180 y 1440×1000, con dominios y respuestas locales simuladas, no contra producción. Revisa cuatro políticas y cinco formularios por tamaño, registro, ausencia de envío sin aceptación, cookies separadas y desbordamiento horizontal. El artefacto **legal-responsive-evidence** contiene capturas y `results.json`.

## Límites concretos que permanecen para operación

- **Correo:** los alias fueron creados según el propietario. Falta una prueba real de recepción/respuesta y del remitente automatizado. No se afirma correo operativo ni se envían correos de prueba sin instrucción.
- **Privacidad contractual de proveedores:** el repositorio identifica servicios pero no acredita regiones contratadas, anexos de tratamiento ni ciclos reales de respaldo. Los textos no inventan esos datos. La comprobación operativa/documental debe completarse antes de afirmar cumplimiento multinacional o transferencias verificadas.
- **Residencial pagado:** el hook preparado no elimina `RESIDENTIAL_PUBLICATION_NOT_READY`. La entrega residencial necesita su receptor privado autorizado; no se lo sustituye por una ficha pública. Esta conexión se verifica en la fase de pagos, manteniendo la vivienda privada.
- **Pagos y renovación:** esta entrega prepara las condiciones y el hook seguro. No activa pasarelas, cobros, entrega productiva ni automatización de vencimientos. La operación de renovación/vencimiento y permanencia del identificador deberá verificarse con el trabajo #101 y la próxima fase de pagos.
- **GTM:** no se carga el contenedor hasta inventariar y validar sus etiquetas. GA tiene elección separada. No se toca la analítica ni las fichas históricas generadas.
- **Producción:** no se han fusionado ni desplegado cambios, ni probado los flujos con usuarios reales. La revisión final debe confirmar también dominios, contactos y políticas visibles después del despliegue autorizado.

## Preservación

Sin cambios en `core/runtime/general-auth.ts`, `legacy.ts`, `new-address-publication.ts`, `r2-storage.ts`, migraciones, Excel, Apps Script, `codes.json`, plantilla o fichas históricas. No se modificaron precios ni las fechas/beneficios promocionales mostrados actualmente en la aplicación. No se ejecutó SQL productivo. Los escenarios y pedidos pagados de pruebas son exclusivamente sintéticos y locales al runner de CI.

## Referencias comprobadas

- Cuatro PDF corregidos aprobados por el titular el 17-oct, recuperados por sus nombres exactos; fuente transcrita en `fuentes-corregidas/`.
- Decisiones posteriores sobre activación automática de Residencial/Premium/Premium Pro, revisión de gratuitos, privacidad y no renovación automática: #99 y solicitud actual del propietario.
- Google documenta `cookie_expires=0` como cookie de sesión: https://developers.google.com/tag-platform/security/guides/customize-cookies . Este valor está implementado, no se presenta como una duración observada de la configuración anterior.

**Salida:** verificar CI del último commit y evidencia; revisar el contenido y los límites señalados; obtener aprobación expresa para fusión/despliegue; comprobar ambos dominios y los flujos reales tras desplegar. Solo entonces procede declarar «Legal operativo».

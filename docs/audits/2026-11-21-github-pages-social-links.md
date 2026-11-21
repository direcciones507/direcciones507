# Direcciones507: auditoría de Pages y enlaces sociales

Fecha: 21 de noviembre de 2026 (Panamá). Auditoría de solo lectura de producción.
Base de código auditada: `ae41f868391e1f675885d2cf95be78cf3dad1b30` (main).
Base publicada: `726bcd09b032b853bac23bd7805803de8c8f03dd` (gh-pages).

## Causa comprobada

Settings → Pages muestra **Deploy from a branch**, **gh-pages**, **/ (root)** y
dominio `direcciones507.com`. Los cambios #354–#357 actualizaron `main:index.html`,
pero esa no es la fuente publicada. La portada de gh-pages conserva las tres URL
anteriores. No hace falta habilitar Generate AD507 Pages ni cambiar DNS.

GET HTTPS del apex devuelve 200. `https://www.direcciones507.com/` termina en
`https://direcciones507.com/` y entrega el mismo HTML. Ambos cuerpos y el index de
gh-pages tienen SHA-256:
`f975c656afc294da71c05b37dfb92e9342e067b33d8f8bdab193e91cde607e02`.
Esto demuestra una diferencia de fuente publicada, no solo una suposición de caché.

El [despliegue activo #1365](https://github.com/direcciones507/direcciones507/actions/runs/44586321313)
del 19 de noviembre tuvo éxito y corresponde a `726bcd09...`, rama gh-pages.
El log de deploy (job `135780331391`) identifica `artifact_name: github-pages`,
`artifact_id: 14561307685` y `pages_build_version: 726bcd09b032b853bac23bd7805803de8c8f03dd`.
Encontró un artefacto y terminó en `Reported success!`. Actualmente el listado de
artefactos de esa ejecución está vacío; no se descargó ni reconstruyó ese paquete.
La versión y el contenido servido quedaron contrastados mediante el log y el hash.

## Fallos históricos y deshabilitación

El panel del generador muestra 1003 ejecuciones históricas y el aviso
**This workflow was disabled manually.** Eso no significa 1003 fallos.

Las dos últimas ejecuciones fallidas inspeccionadas muestran el mismo error:
`The job was not started because your account is locked due to a billing issue.`

| Ejecución | Evento | Resultado |
| --- | --- | --- |
| [#1003](https://github.com/direcciones507/direcciones507/actions/runs/40259559191) | push main, e3b3095 | build bloqueado antes de iniciar; deploy omitido; 3 s |
| [#1002](https://github.com/direcciones507/direcciones507/actions/runs/40259552164) | push main, c849ee4 | mismo bloqueo; deploy omitido; 4 s |

Ambas corresponden al 25 de octubre, 21:31 de Panamá (26 de octubre UTC).
El aviso de migración de ubuntu-latest es informativo y no explica esos fallos.
No hubo pasos de generación ejecutados ni artefactos en esas dos ejecuciones.
Esto acredita el bloqueo de facturación **en esas ejecuciones**, no su vigencia hoy.

La interfaz no aporta quién deshabilitó el workflow, cuándo ni su motivo. No se
atribuye una causa humana sin evidencia ni se revisa facturación privada ajena al
alcance. La secuencia de fallos es compatible con haberlo detenido para evitar
ruido, pero no demuestra ese motivo. Se conserva deshabilitado.

## Inventario de disparadores antes de este PR

Fuente: los 13 archivos de `.github/workflows` de main. La presencia de un archivo
describe sus disparadores; no demuestra por sí sola su estado habilitado en GitHub.
Solo el estado deshabilitado de Generate se verificó expresamente en la interfaz.

| Archivo / workflow | Disparadores configurados | Efecto relevante |
| --- | --- | --- |
| generate.yml | push a main sin filtro de rutas; workflow_dispatch | Genera y publica el sitio completo; deshabilitado manualmente |
| auto-sync-ad507.yml | workflow_dispatch | Consulta maestro y rutas; si falta una invoca generate.yml |
| run-drive-image-normalizer.yml | push a main | Crea ejecución por cada push; job solo si mensaje exacto `Run Drive image normalizer`; puede escribir template/index en main |
| render-homepage-og.yml | push si cambia og-source/og-507-2026.svg u og-source/og-latam-2026.svg; workflow_dispatch | Renderiza PNG y hace commit a la rama actual |
| patch-button-style.yml | push si cambia su propio YAML, sin restricción de rama | Parchea index y hace push HEAD:main |
| patch-free-address.yml | push si cambia su propio YAML, sin restricción de rama | Parchea index y hace push HEAD:main |
| account-browser-regression.yml | push main y PR; paths assets/legal-consent.js, index.html, core/runtime/** o su YAML | Validación; puede duplicarse como comprobación de PR y tras merge |
| analytics-validation.yml | PR con core/runtime/** o su YAML | Validación |
| legal-validation.yml | PR con core/runtime/**, assets/legal-consent.js, index.html, legal/** o su YAML | Validación; cancela comprobaciones anteriores del mismo PR |
| temporary-event-policy.yml | PR con core/runtime/** o su YAML | Validación; cancela comprobaciones anteriores del mismo PR |
| radar-validation.yml | push a feature/radar-en-vivo; PR por rutas Radar/tests radar o su YAML | Validación; puede solaparse con otras suites de Core |
| test-consolidated-core.yml | push a feat/core-consolidated-oauth-20261006 o fix/panama-panel-publication-20261012; PR por core/runtime/**, db/migrations/0005_general_google_auth.sql o su YAML | Valida en BD aislada; cancela ejecuciones anteriores de compatibilidad y eventos de esa rama; no las relanza |
| validate-db-migrations.yml | PR por db/migrations/**, scripts/validate-migrations.py o su YAML; workflow_dispatch | Validación, no aplicación de migraciones |
| Pages nativo (no YAML del repositorio) | publicación de la rama configurada gh-pages | Construye/despliega todo el árbol existente; no genera las direcciones |
| Dependabot (configuración separada) | semanal, bun en /core/runtime y github-actions en /; límite de 2 PR abiertos por ecosistema | Automatización recurrente existente; puede provocar CI de PR; sin cambios en esta tarea |

No hay `schedule`, `workflow_run`, `workflow_call` ni `repository_dispatch` en los
13 workflows de main. El commit `dfb776fef182720e5244ad921be134778ddc040d` retiró
el cron `*/15 * * * *` de auto-sync el 25 de octubre. No se restauró.
Los nombres de workflows antiguos que aún aparecen en Actions no significan que
esos archivos sigan presentes ni que tengan un disparador activo en main.

## Riesgos y ciclos

- El generador conserva push main aunque esté deshabilitado: si alguien lo
  habilita, volvería a generar por cada commit de main. Este PR quita ese push.
- Auto-sync era manual pero podía encadenar generate.yml con `actions: write`.
  Este PR elimina la llamada y ese permiso. Solo informa para revisión manual.
  No se encontró un camino inverso que cierre un ciclo en los YAML actuales.
- Generate reconstruye out desde la fuente externa y filtra códigos. Un mínimo
  de 20 registros no garantiza conservar todos los clientes; desplegar un sitio
  parcial sustituye el artefacto completo, no añade solamente la portada.
- Generate usa una fuente externa de códigos distinta a la de auto-sync y
  ejecuta parches sobre index/template. No se consultaron ni modificaron esas
  fuentes; habilitarlo requiere una auditoría independiente de conservación.
- Su `sleep 90` reconoce una carrera con el Pages nativo. Esperar no garantiza
  qué publicación termina última. No se ejecutó ni se modificó su despliegue.
- Los dos parches de una sola ocasión escriben a main desde eventos push sin
  restricción de rama. OG y normalizador también escriben commits. Conviene
  retirarlos o convertirlos en herramientas manuales en una revisión posterior;
  no son necesarios para corregir estos tres enlaces.
- No se encontraron reintentos ilimitados ni relanzamientos masivos en el código
  auditado. La cancelación por concurrencia y el polling acotado de deploy no son
  un ciclo generador. Un fallo rojo por sí solo no acredita un bucle.
- La publicación nativa de Pages desde gh-pages sigue siendo automática al
  actualizar esa rama. Se controla mediante un PR revisado y una fusión expresamente
  autorizada; esta tarea no cambia su configuración ni fusiona la rama.

## Corrección mínima de la portada

[PR #361](https://github.com/direcciones507/direcciones507/pull/361), borrador,
rama `fix/pages-social-links-only`, base **gh-pages**. Únicamente tres href de
`index.html`:

| Red | Destino |
| --- | --- |
| Instagram | https://www.instagram.com/direccioneslatam/ |
| Facebook | https://www.facebook.com/share/1K5ofVtKLX/ |
| TikTok | https://www.tiktok.com/@direccioneslatam |

No se copia el index de main, no se regeneran páginas y no se añade un workflow.
Los cambios de este PR de control en main son independientes de #361 y no son
necesarios para publicar sus tres enlaces. Ninguno está fusionado.

### Validación de conservación de #361

- Único archivo modificado: index.html; tres líneas sustituidas.
- Deshacer únicamente esas tres sustituciones devuelve exactamente los bytes
  del index de gh-pages. SHA-256 candidato:
  `4197e38f95f75e43dada9049e5c77e7ed36b7e93b3435b7d696fb3971ec5d78d`.
- Los otros 135 archivos del árbol publicado se compararon byte por byte:
  idénticos, incluidas las 50 rutas AD507 (variantes mayúsculas/minúsculas),
  imágenes, sitemap, CNAME y 404. No se afirma que 50 rutas sean 50 clientes.
- Los scripts inline y todos los demás href del index son idénticos, conservando
  búsqueda por código, enlaces comerciales y lógica de QR.
- `git diff --check` correcto. No se ejecutó el generador histórico para probarlo.
- Son pruebas de conservación del código preparado. La verificación de la nueva
  publicación y sus enlaces se realizará después de una aprobación para publicar.

## Alertas propuestas, sin activar

Preferir notificaciones nativas de GitHub, sin añadir cron, workflow_run, correo
programado ni reintentos. En ajustes personales → Notifications → System → Actions,
proponer Email y/o On GitHub con **Only notify for failed workflows**; comprobar
también la suscripción al repositorio. Requiere aprobación antes de cambiar ajustes.

La documentación indica que las notificaciones de Actions cubren las ejecuciones
que haya iniciado el usuario; no se debe prometer que un administrador recibirá
todos los fallos de todos los actores solo con esa preferencia. Tras aprobarla,
comprobar destinatario/cobertura en la próxima ejecución legítima, sin provocar
un fallo artificial ni añadir un monitor recurrente.

Fuentes oficiales:
- https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications
- https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs

## Límites y siguiente paso autorizado

No se modificaron direcciones, códigos, QR, Excel, PostgreSQL, pagos, membresías,
autenticación, DNS, dominios, Cloudflare ni Railway. No se ejecutaron migraciones,
generación, reintentos, despliegues ni habilitaciones de workflows. No se cambiaron
notificaciones.

Después de revisar el diff y antes de publicar #361, comprobar que gh-pages sigue
en la base auditada; si avanzó, comparar de nuevo la conservación sobre esa nueva
base. Solo con autorización explícita, fusionar #361 (esto publica mediante Pages
nativo), esperar el único build legítimo y comprobar los tres href en apex/www y
rutas de control. Si falla, detenerse y revisar; no relanzar en bucle. No habilitar
Generate ni ejecutar auto-sync para esta corrección.

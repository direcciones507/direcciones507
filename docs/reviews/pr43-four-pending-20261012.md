# PR #43 — cuatro pendientes

Base: `0489da005d0692a6dbdefa45caf311594be50a76`, rama `feat/admin-ui-20261006`. Trabajo exclusivo sobre esta rama, sin merge, push, despliegue, pagos, SQL productivo ni traslado histórico.

| Pendiente | Resultado | Evidencia |
|---|---|---|
| Compatibilidad cancelada | BLOQUEADO | Reejecutado solo job 114662996863 del run 38203887288. Intento 2/job 114664057319: 132 pass, 1 fail. Fallo: commercial-entry.test.ts esperaba >1 etiquetas script; renderer combina ambos bloques en una. Corregido localmente: presencia de panel y ambos endpoints Natalie, compilación de todos los scripts y nonce CSP; 1 pass, 9 assertions. No subido: la rama está conectada a producción. |
| Natalie HTTPS | FALLÓ | OPTIONS HTTPS controlled-session: 204, ACAO exacto https://direcciones507.com, request ID Upg0LXq1QZKrK4dtY53eZw. POST HTTPS del payload real {}: 403 SCOPE_OR_PERMISSION_INVALID, ACAO correcto, request ID O9Mola6yR6q4KMULxtoGcA. El guard existente requiere scope encontrado, agent.status=draft y cero permisos activos. No se identificó cuál condición incumple y no se alteraron permisos ni estado productivos. No se obtuvo sesión ni respuesta. |
| Aislamiento Mi cuenta | APROBADO | Nuevo test PR43: dos CLIENT y un ADMIN, dos direcciones por usuario y país PA/CO; pruebas en ambos orígenes y cambios PA→CO→PA; cero registros ajenos, cursor entre países rechazado, CLIENT admin403, ADMIN review200, anónimo401, cross-origin403. Prueba OAuth existente: misma identidad en ambos hosts, cookies y estado ligados a origen, rechazo de cruce y logout aislado. PostgreSQL 18.1 descartable local. |
| Flujo comercial Panamá con fotografía R2 real | BLOQUEADO | Prueba HTTP aislada existente APROBADA: OAuth simulado→multipart/logo real convertido a WebP→PostgreSQL real→ADMIN approve→publicación sintética verificada→ficha200→URL canónica→contenido QR/copy→entrega en Mi cuenta→foto200→idempotencia. Transporte local HTTP con URL HTTPS reconstruida, Google y registro histórico simulados y R2 Map en memoria: no demuestra bucket Cloudflare ni descarga del QR externo ni WhatsApp. Falta ejecutar misma cadena con almacenamiento R2 real aislado; no usar DB productiva. |

## Reejecución y cancelación

Intento original cancelado durante Initialize containers, antes de checkout, build y tests. Log: `A task was canceled`; no identifica concurrencia como causa. Por tanto se acredita cancelación sin resultado funcional, no una causa de concurrencia confirmada. La reejecución sí detectó un fallo de assertion: no debe presentarse como mera cancelación ni como fallo del widget.

Run: https://github.com/direcciones507/direcciones507/actions/runs/38203887288/attempts/2

## Pruebas selectivas finales

`bun test tests/consolidated.test.ts --test-name-pattern 'PR43 Mi cuenta|one OAuth|existing Natalie backend|isolated HTTP commercial journey|LATAM uses existing'`: 5 pass, 0 fail, 300 assertions. `bun test tests/commercial-entry.test.ts --test-name-pattern 'commercial entry applies CSP'`: 1 pass, 0 fail, 9 assertions. `git diff --check`: aprobado. No suite histórica repetida después de la reejecución explícitamente solicitada del job.

LATAM continuó sin activación: PA, CO, CR, GT, SV, HN, NI, MX; creación ADMIN, país/territorio persistidos, medios privados con proveedor simulado, propiedad y prefijos, publicación internacional cerrada. No cambios de planes ni pagos.

Limitación del ejecutor local: solo UID 0 mapeado y llamadas de comandos en espacios de red separados; se arrancó PostgreSQL 18.1 y tests dentro de una misma llamada. Un adaptador LD_PRELOAD temporal, externo al repositorio, ajustó comprobaciones UID/stat de los binarios PostgreSQL para este entorno. No se usa en el runtime de la plataforma ni constituye verificación de permisos del SO. Solo destinos 127.0.0.1 y bases sintéticas. PostgreSQL se detuvo al terminar.

## Bloqueo de subida

Railway describe-service: proyecto amused-enchantment `2b6d4e6c-e1d4-471d-a77d-c9bdb711650d`, environment production `909fdec4-8930-4405-ae53-6e8fb0d3f901`, ad507-core `b0da9f70-7790-4729-a728-aaa4aa3f571d`; source.branch=`feat/admin-ui-20261006`, checkSuites=false. Último deployment observado `005e0c46-e59b-4ea1-9afd-923920c1c894` SUCCESS, sin staged changes.

Subir la corrección podría iniciar despliegue productivo. Se conserva el cambio local sobre la rama del PR y no se altera la configuración Railway. Para poder actualizar el PR sin despliegue debe separarse primero el auto-deploy de esta rama mediante una acción expresamente autorizada. La prueba de compatibilidad remota permanece fallida hasta subir y verificar la corrección.

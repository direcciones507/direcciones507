# PR #43 — correcciones finales y estado verificable

Repositorio direcciones507/direcciones507. Rama feat/admin-ui-20261006. Se recuperó el commit local d48bf4811fa50123759071e27bc35e2d35cb21f8. GitHub sigue en 0489da005d0692a6dbdefa45caf311594be50a76. Todos los cambios siguientes son locales: no push, merge, deploy, SQL productivo, precios, credenciales, DNS o traslados históricos.

## Correcciones ejecutadas

1. Natalie: dos subconsultas COUNT(*) devolvían int8 como string. PostgreSQL18.1 + postgres.js3.4.7 reprodujo original="0", typeof=string, original!==0=true. COUNT(*)::int devuelve number0 y el guard original ya no rechaza un scope válido. Se corrigieron solamente esas dos proyecciones, conservando status=draft y cero permisos activos.
2. Natalie: faltaba despachar POST controlled-conversation al handler ya existente. Conectado; no otra ruta o asistente.
3. Natalie: faltaba reclamar el turno antes del proveedor. UPDATE atómico valida usuario/scope/permiso/autorización/revocación, contador3 y ausencia de turno en curso. La finalización exige el turno reservado; fallos del proveedor consumen la sesión. No se alteraron modelos, presupuestos, conocimiento ni límites.
4. Panamá/LATAM: el renderer reemplazaba incondicionalmente la cabecera de Panamá por LATAM y titulaba Panamá como LATAM. Cabeceras/títulos/bienvenida/pie distinguen las entradas comerciales; mismo formulario, Core, navegación y widget. Identidad inicial CO muestra Colombia antes de ejecutar JS. Histórico no modificado.
5. Diagnóstico R2 existente ampliado opcionalmente con --photo: WebP sintética12×12, PUT condicional solo en _diagnostics/ad507-r2/UUID.webp, GET firmado con comparación exacta, rechazo de GET sin firma, DELETE y GET404 NoSuchKey. El modo anterior texto se conserva. Nunca enumera ni modifica fotografías reales. Reporte sin credenciales; r2://bucket/key identifica el objeto privado, sin crear URL pública permanente.
6. Diagnóstico Natalie preparado: transacción repeatable-read READ ONLY, consultas únicamente al scope existente y conteos oficiales; devuelve razones específicas y booleanos de configuración sin mostrar OPENAI_API_KEY, DATABASE_URL, R2 ni contenido de memoria.

El snapshot legacy.snapshot.txt no se cambió. legacy-corrections.ts documenta y valida las sustituciones exactas permitidas; check-legacy y el test de extracción exigen que el resto del legacy sea idéntico al original y conservan las12 rutas residenciales.

## Resultados de las pruebas afectadas

| Prueba | Resultado | Alcance |
|---|---|---|
| Natalie HTTPS aislado | 4 pass / 0 fail / 60 assertions | Mismos handlers legacy, TLS real local con certificado efímero autofirmado, PostgreSQL18.1 real, OpenAI simulado. PA y LATAM: sesión200, tres conversaciones200, cuarta403, mensajes persistidos; concurrencia200/403; proveedor502 consume sesión; origen, scope, permisos, estado y overrides cerrados. |
| R2 diagnóstico | 5 pass / 0 fail / 46 assertions | Proveedor simulado. Fotografía WebP real, privado, clave aislada y limpieza; denegaciones y fallos inciertos. NO prueba real de Cloudflare. |
| Entradas y widget | 8 pass / 0 fail / 80 assertions | Separación de marcas/contextos, formulario compartido, navegación sin perder archivos, widget único, CSPnonce y controles de habilitación. |
| Legacy afectado | 2 pass / 0 fail / 67 assertions | Extracción exacta excepto sustituciones revisadas;12 handlers residenciales y dispatch protegido. |

Total19 pass / 0 fail,253 assertions. Build Core y compilación de ambos diagnósticos aprobados; git diff --check aprobado. Mi cuenta conserva el aprobado anterior: no se repitió. Tampoco se repitió el flujo comercial sintético, cuya lógica no fue modificada.

Nota del entorno de pruebas: igual que en la comprobación anterior, PostgreSQL se ejecutó en destinos127.0.0.1 con bases descartables creadas exclusivamente para las pruebas, en la misma llamada que Bun. Adaptador temporal UID/stat fuera del repositorio para el ejecutor que solo mapea UID0; no forma parte del producto ni acredita permisos del SO de producción. Procesos PostgreSQL detenidos al terminar.

## Estado real

Natalie Panamá: evidenciaHTTPS anterior POST{}=403 SCOPE_OR_PERMISSION_INVALID. Existe una causa técnica reproducida y corregida localmente; la falta de acceso SQL impide confirmar si además hay scopes ausentes, status diferente o permisos activos en producción. No se afirma que la corrección haya llegado al servicio real ni que OpenAI real haya respondido.

Natalie LATAM: preflight HTTPS del servicio existente con Origin https://direcciones.lat devuelve403 sin ACAO; requestID YdEa5-nGRtaWTrvq6WHkDg (2026-10-12T04:51:49Z). El servicio no lista AD507_INTERNATIONAL_DOMAIN_VERIFIED. La corrección pasa en fixture con opt-in explícito, pero no habilita el origen productivo. Verificar dominio y autorizar configuración antes de habilitarlo; sin abrir CORS general.

R2 real: BLOQUEADO. railway_list_variables devuelve valuesRedacted=true: confirma los cuatro nombresR2, DATABASE_URL y OPENAI_API_KEY pero no sus valores. No CLI Railway autenticado ni ejecución remota/SQL mediante el conector. No se realizó PUT/GET/DELETE real ni se cambió ninguna foto. La intervención mínima es ejecutar el diagnóstico preparado dentro de ad507-core, heredando variables existentes; no entregar ni cambiar secretos y no crear infraestructura.

Panamá completo: el flujo ya aprobado continúa solicitud→ADMIN→R2 simulado→publicación sintética→URL canónica→QR/copy→entrega en Mi cuenta. Pendiente unir almacenamientoR2 real con la base local descartable mediante un canal autorizado de ejecución/credenciales. La pruebaR2 privada por sí sola no acredita la publicación ni entrega del flujo completo. Las direcciones históricas, sus códigos y enlaces no se tocaron.

LATAM: avanzó la interfaz compartida y la separación de marca sin activar publicación o cobros. Mantiene los ocho países preparadosPA/CO/CR/GT/SV/HN/NI/MX y pasarelas deshabilitadas. La integración Natalie está aprobada únicamente en HTTPS aislado; el ingreso de dominio/origen productivo permanece bloqueado.

## Actualización segura del PR y autorización

Railway ad507-core production sigue la rama feat/admin-ui-20261006, checkSuites=false; subir commits puede desplegar. No se subió ningún commit ni se reejecutóCI remoto contra código que no está en GitHub.

Existe una vía soportada: Settings → integraciónGitHub → Disable Auto Deploy. Documentación https://docs.railway.com/deployments/github-autodeploys#disable-automatic-deployments. Este cambio productivo de configuración NO se ejecutó; requiere autorización previa del usuario. Después de confirmar deshabilitación y conservar el deployment vigente, subir solamente esta rama y verificarCI del nuevoSHA. No usar Wait for CI como sustituto: aun con checks verdes desplegaría sin autorización. No desconectar repositorio ni cambiar ramas por suposición.

Para diagnóstico sin desplegar nuevos archivos, un operador con CLI/SSH ya autenticado puede enviar los .mjs compilados por stdin. Estos comandos no se ejecutaron en Railway; el modo stdin se verificó localmente:

```bash
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 --service b0da9f70-7790-4729-a728-aaa4aa3f571d -- sh -c 'cd /app/core/runtime && bun -' < core/runtime/scripts/natalie-diagnostic.mjs
railway ssh --project 2b6d4e6c-e1d4-471d-a77d-c9bdb711650d --environment 909fdec4-8930-4405-ae53-6e8fb0d3f901 --service b0da9f70-7790-4729-a728-aaa4aa3f571d -- sh -c 'cd /app/core/runtime && bun - --photo' < core/runtime/scripts/r2-diagnostic.mjs
```

Rutas de entrada relativas al checkout que contiene las correcciones. El primer comando solo leeSQL; el segundo únicamente crea y elimina su fotografía temporal autorizada. RailwayCLI/SSH requiere autenticación y clave registrada existentes; no se registró una clave ni se solicitó un secreto. Referencia https://docs.railway.com/cli/ssh#run-a-single-command.

## Condiciones pendientes para fusión

- Auto Deploy deshabilitado y evidencia de ausencia de despliegue tras subir las correcciones.
- PR43 actualizado con los commits locales yCI verde en eseSHA, incluida la correcciónCSP de d48bf48.
- Diagnóstico de scopes/configuración real ejecutado; si requiere ajuste de permisos/estado/variables, propuesta exacta y autorización antes de aplicarlo. No volver Natalie activo para eludir un guard draft.
- Escritura/lectura/acceso privado/eliminación/ausencia de fotoR2 reales acreditados.
- CadenaPanamá íntegra sobre base descartable con R2 real y entrega correspondiente, sin mover direcciones reales.
- Natalie validada con proveedor real en el servicio autorizado: cambios de código no pueden llegar a producción sin autorización específica de despliegue. LATAM exige además verificación del dominio/origen y autorización de su configuración.

Fusión y activación comercial no están autorizadas por este cierre.

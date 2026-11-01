# Códigos públicos Premium y Premium Pro

## Causa y contrato

El alta guardaba `namedCode`, pero el editor no aceptaba ni mostraba el campo. El asignador y las rutas asumían un código con prefijo, en mayúsculas. Esa identidad no se debe renombrar: los medios, estadísticas, pagos y QR anteriores dependen de ella.

Se conserva `addresses.id` y `addresses.code`. Solo para BUSINESS_PREMIUM y BUSINESS_PREMIUM_PRO nuevos/no históricos se usan los campos JSONB existentes:

- `namedCode`: nombre escrito con su capitalización original.
- `publicCode`: `AD507-` + nombre en Premium; nombre sin prefijo en Pro.
- `codeAliases`: nombres públicos anteriores, reservados para el mismo propietario. Nunca se reasignan a otra ficha.

El código numérico y los alias anteriores redirigen con 308 al enlace actual. Fotografías y estadísticas siguen usando la identidad interna. La ficha muestra el nombre público y sus mecanismos existentes de compartir/QR usan el URL canónico personalizado. Mi cuenta y ADMIN muestran/copían el código público y recuperan el nombre al editar.

No se aplica DDL ni migración masiva, no se renombra ninguna ficha activa automáticamente, no se modifican fechas, planes ni registros de pagos. Los históricos conservan su ruta original y quedan excluidos del editor. Los borradores antiguos con nombre válido se adaptan al publicar; las fichas activas solo cambian cuando su propietario/ADMIN guarda el campo.

## Unicidad y permisos

Validación de letras ASCII, números y guiones separados; máximo 80 caracteres, sin espacios/puntuación, prefijos escritos manualmente, rutas reservadas ni nombres N+8 dígitos del asignador. Comprobación sin distinción de mayúsculas frente a códigos internos, nombres públicos y alias, incluidos registros retirados. Premium comprueba también el registro histórico de solo lectura y falla cerrado si no responde.

El guardado/alta toma un bloqueo asesor PostgreSQL común de namespace dentro de la transacción; la publicación conserva el mismo bloqueo durante la asignación interna. El editor revalida propietario/ADMIN, estado, exclusión histórica y versión antes de escribir. El endpoint autenticado de disponibilidad es orientativo; el guardado repite la comprobación bajo bloqueo. Se mantiene auditoría y se evitan reescrituras de medios/redes cuando no cambiaron.

## Verificación local reproducible

Desde `core/runtime`, con Bun 1.4.0:

```
bun install --frozen-lockfile
bun test tests/custom-public-code.test.ts
bun scripts/check-legacy.ts
```

La prueba usa PostgreSQL WASM PGlite 0.5.14 con pgcrypto, esquema real de fundación/autenticación/solicitudes/países, datos sintéticos y R2 simulado. Cubre alta/publicación de ambos planes, edición y recuperación exacta de direcciones-LATAM, permisos/versiones, URLs/QR, redirección numérica, mayúsculas, duplicados/alias, solicitudes paralelas, listado/copiar/estadísticas internas, conservación de medios y exclusión de otros planes/históricos. No conecta bases externas ni proveedores de pago.

La regresión ejecutable registra 179 aprobadas y un fallo anterior de huella de scripts en `published-card-presentation.test.ts`; la plantilla compartida permanece idéntica a main. Los cinco runners que requieren PostgreSQL nativo no se invocaron: el bloqueo de permisos del entorno anterior sigue documentado; las pruebas WASM no se presentan como validación multiconexión nativa. Los resultados locales no sustituyen comprobar la edición con la sesión real del propietario después del despliegue.

Para producción: desplegar únicamente el código por el flujo habitual GitHub/Railway, observar SUCCESS y verificar la edición autenticada. No requiere variables nuevas, migraciones, renovación ni pago adicional. No hay credenciales predeterminadas ni vías de acceso especiales para la comprobación.

# PR #377 · revisión visual final

Base revisada: `792528dfde143ed6634358557d3ee1e7abb9e912`, rama `feature/latam-forms-visual-unification-phase1`. Sus cinco workflows estaban aprobados al iniciar; no se modifican ni se relanzan manualmente.

## Hallazgos y correcciones

| Problema confirmado | Corrección visual |
| --- | --- |
| Con tres direcciones, «Crear nueva dirección» quedaba a más de 1.700 px del inicio en móvil. | El bloque existente de creación precede al listado en el HTML. Se conserva el mismo orden para teclado y lectura, sin duplicar botones ni handlers. |
| La tarjeta de cabecera y el contenedor exterior del formulario añadían cajas y restaban 40 px útiles en móvil. | Se retiran borde, fondo y relleno de esos dos contenedores; permanecen las fichas de cada dirección. |
| El grupo anidado de país/territorio dejaba un gran hueco en la columna derecha del formulario de escritorio. | Su contenedor ocupa la fila completa; mantiene las columnas adaptables internas. |
| La casilla de aceptación medía unos 45 px de alto frente a 19 px de ancho. | El control queda cuadrado a 20 px, sin cambiar texto, estado, validación ni eventos. |
| Temporal no ofrecía retorno visible al panel; sus selectores de archivo usaban letra menor que los demás campos. | Enlace relativo «Volver a Mi panel» y texto de archivos a 16 px. |
| Actualizar competía como acción principal y la tarjeta Temporal se elevaba y escalaba al pasar el ratón. | Actualizar usa plateado/azul marino; Temporal conserva su posición y solo una transición breve de borde. |

## Matriz final de navegador

Se usaron los renderizadores reales de la rama, con las respuestas ficticias de cuenta equivalentes a las pruebas existentes. Todas las escrituras del servidor aislado responden 403. No se usó sesión ni información de producción.

| Vista | 320 px | 390 px | 820 px | 1440 px |
| --- | --- | --- | --- | --- |
| Mi panel | Aprobado | Aprobado | Aprobado | Aprobado |
| Residencial | Aprobado | Aprobado | Aprobado | Aprobado |
| Premium | Aprobado | Aprobado | Aprobado | Aprobado |
| Premium Pro | Aprobado | Aprobado | Aprobado | Aprobado |
| Temporal | Aprobado | Aprobado | Aprobado | Aprobado |

Las veinte vistas no presentan desbordamiento horizontal, campos fuera del ancho ni campos visibles con letra inferior a 16 px. Se confirmó la fila completa del grupo territorial en los tres formularios compartidos. En 320 px el formulario pasa de 249 a 289 px útiles, sin cambiar su contenido.

Navegación comprobada con controles reales: abrir Residencial desde Mi panel, cerrar formulario y volver al panel; «Volver a Mi panel» desde Temporal. Se seleccionó una imagen ficticia de 800×600 en logo y galería de Premium Pro mediante el selector de archivos, sin enviar la solicitud. La selección no añade una vista previa inmediata nueva: se conserva el flujo existente.

## Comprobaciones de código

- El JavaScript cliente del panel y Temporal es idéntico al de la base revisada.
- Los scripts inline generados para direcciones507.com y direcciones.lat compilan sin errores.
- El bloque de creación precede al listado en el HTML generado para ambos dominios.
- El enlace Temporal apunta al `/panel` existente.
- `git diff --check` aprobado. No se añaden pruebas duplicadas ni se alteran las existentes.

El cambio de orden corresponde al HTML de presentación compartido. El ajuste de estilo del panel sigue delimitado por `body.latam-account-panel`; la matriz de navegador corresponde a esa presentación LATAM compartida. La variante 507 se comprobó en renderizado y sintaxis, sin repetir una segunda matriz visual.

## Evidencia y límites

[Panel móvil, 390×900](panel-mobile.jpg) · [Premium Pro de escritorio, 1440×1000](premium-pro-desktop.jpg).

Capturas reales de Chrome con datos ficticios, no imágenes generadas. No se probó en teléfono físico ni Safari: quedan pendientes teclado móvil, tacto y revisión del propietario. No se hicieron envíos, pagos, cambios de vigencia, pruebas QR ni escrituras reales; sus scripts y reglas permanecen intactos. La validación automática final corresponde al nuevo commit del mismo PR.

No fusionar ni desplegar sin aprobación.

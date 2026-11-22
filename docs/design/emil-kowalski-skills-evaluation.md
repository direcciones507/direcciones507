# Evaluación segura de Emil Kowalski Skills

Repositorio oficial: https://github.com/emilkowalski/skills

## Alcance
Esta rama prepara la adopción de las habilidades de diseño y animación. **No instala dependencias, no ejecuta comandos, no modifica el sitio, no activa workflows ni despliega producción.**

## Instalación futura (solo en un agente de desarrollo compatible)
Antes de ejecutar, revisar el contenido y la versión del paquete y confirmar la ubicación de instalación:

```sh
npx skills@latest add emilkowalski/skills
```

La instalación se hará exclusivamente en un entorno aislado, previa aprobación. No incorporar automáticamente el paquete a la aplicación web ni al pipeline de CI.

## Habilidades prioritarias
- `emil-design-eng`: criterios de diseño y movimiento.
- `review-animations` y `improve-animations`: auditoría de efectos existentes.
- `animation-performance`: rendimiento y fluidez.
- `mobile-native` y `gestures`: uso táctil en teléfonos y tabletas.
- `remove-animations`: retirar movimiento innecesario.
- `learn-taste`: consolidar criterios de diseño revisados y aprobados.

## Restricciones para Direcciones507 / LATAM / Radar
1. Preservar códigos, enlaces, QR, autenticación, pagos, PIN y datos existentes.
2. Mantener la identidad visual azul marino y plateado; evitar neón y morado.
3. Prototipos y cambios visuales en ramas separadas, sin despliegues automáticos.
4. Probar teléfono, tableta, accesibilidad, movimiento reducido y rendimiento.
5. No fusionar ni publicar sin revisión y autorización explícita.
6. No instalar paquetes en producción ni habilitar disparadores automáticos por esta integración.

## Próxima fase
Revisar las instrucciones oficiales de cada skill, elegir las apropiadas para un componente piloto (por ejemplo, carrusel de tarjetas Premium), preparar un prototipo y verificar regresiones antes de solicitar aprobación.

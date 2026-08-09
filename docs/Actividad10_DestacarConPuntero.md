# Actividad 10 — Destacar contenido mediante el puntero

## Qué se implementó

Para destacar cada fila de la tabla de mascotas del dashboard al pasar el mouse sobre ella, usé la propiedad `[rowHover]` del componente `Table` de PrimeNG 21. Esta propiedad activa la clase `p-datatable-hoverable`, que ya viene definida por el tema Aura que el proyecto usa como preset por defecto desde el arranque, y la regla CSS de esa clase es la que pinta la fila cuando el puntero está encima.

La decisión de fondo fue no escribir CSS manual desde cero. El tema Aura ya trae resuelto el comportamiento de hover para las filas de las tablas, así que lo que hice fue encender ese mecanismo desde el template, en `dashboard.component.html`, en lugar de reinventar una regla propia que además habría tenido que pelear por especificidad contra las que define el tema. Esto es exactamente el espíritu con el que elegí PrimeNG en este proyecto: aprovechar el mecanismo nativo del framework de componentes en vez de duplicar trabajo que la librería ya resuelve y mantiene.

## Comportamiento exacto observado

El efecto se verificó en el navegador con el mouse real sobre la fila de Camila, la primera fila de la tabla. En reposo, el fondo de la fila es un gris claro base que mide `rgb(248, 250, 252)`. Al pasar el puntero, ese fondo cambia a un tono gris-azulado ligeramente más oscuro, `rgb(241, 245, 249)`, y el cambio no es instantáneo: transiciona de forma suave en aproximadamente 200 milisegundos, que es la duración que el propio tema Aura define para el fondo de sus componentes.

Al retirar el puntero, la fila regresa gradualmente a su color base, otra vez con la misma transición suave en lugar de un salto brusco. En la medición se ve la progresión: primero el color intermedio, después un tono cada vez más cercano al gris claro original y por último el valor base. Es un efecto sutil pero notorio, limitado al cambio de color de fondo: no hay sombras, ni escalado, ni otros adornos, y eso es deliberado, porque así se mantiene consistente con el lenguaje visual del resto del panel, que ya usa el tema Aura en todos sus componentes.

## Por qué esta implementación en particular

La alternativa habría sido escribir un manejador de eventos `mouseenter` y `mouseleave` en cada fila, alternando una clase con JavaScript y definiendo a mano el color, la transición y quizá una sombra o un pequeño escalado para hacer el efecto más llamativo. Esa opción es válida, pero la descarté por tres razones concretas.

Primero, reduce mi código propio: activar `[rowHover]` me ahorra todo un manejador de eventos y una regla CSS que, encima, habría competido por especificidad contra las del tema. Segundo, mantiene consistencia visual automática con el resto del tema Aura del panel: el color y la transición que se ven son los que la librería usa en todas sus tablas, así que el hover de esta tabla luce igual que el de cualquier otra que PrimeNG renderice. Tercero, ya viene probado por la librería, de modo que el comportamiento de hover en dispositivos con puntero y su degradación en pantallas táctiles son responsabilidad de PrimeNG y no un riesgo que yo tenga que validar por mi cuenta. El resultado es el mismo efecto visual que esperaba, pero con menos código, menos mantenimiento y una garantía de calidad que viene del propio componente.

## Evidencia

Se anexa una grabación de pantalla breve donde se demuestra el efecto de hover en tiempo real sobre las filas de la tabla de mascotas del dashboard. En la grabación se aprecia el paso del mouse por varias filas, el cambio de fondo al tono gris-azulado con su transición suave y el regreso gradual al color base cuando el puntero sale de cada fila. El archivo se deja en esta misma carpeta `docs/`, dentro de la subcarpeta `docs/evidencia/` para mantener la organización de las evidencias del proyecto.

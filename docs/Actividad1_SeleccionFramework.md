# Actividad 1 — Selección de framework de trabajo

La decisión tecnológica de este proyecto no surgió de una preferencia personal, sino de las necesidades puntuales que el sistema tiene que cubrir. En este documento explico, con argumentos técnicos verificables, por qué elegí Angular como framework para el frontend, PrimeNG como librería de componentes y Supabase como capa de datos, esta última reaprovechando el proyecto que ya alimenta al resto del ecosistema de otra materia.

## Necesidades del cliente

Estoy construyendo un panel administrativo para un ecosistema de cuidado de mascotas. El panel recibe datos que ya existen en una base de datos real en Supabase y, de manera más adelante, algunos de esos datos deberán poder mostrarse y gestionarse. El esquema de datos ya está definido y probado, así que mi trabajo no parte de cero: parte de información que los dispositivos del ecosistema ya están generando y guardando.

Quien va a usar este panel espera una interfaz profesional y consistente, donde una tabla luzca como la otra y un formulario se comporte igual en todas las pantallas. Diseñar y programar cada control desde cero consumiría tiempo que prefiero invertir en la lógica del negocio y, peor aún, produciría una interfaz con inconsistencias de estilo entre módulos. Ese contexto me empujó a un framework con estructura clara y a una librería de componentes que me entrega coherencia visual y funcional sin que yo tenga que reinventar cada elemento.

## Frontend: por qué Angular 21

Angular me da tres ventajas concretas para este panel. La primera es TypeScript de la forma nativa, con tipado fuerte sobre los modelos de datos del ecosistema. Cuidé que los modelos repliquen las tablas reales de Supabase, así el compilador me avisa de un campo mal escrito o de un tipo de dato que no corresponde antes de que eso llegue a la UI. En un sistema que lee y muestra registros de una base compartida, ese rigor previene errores que son muy difíciles de rastrear en tiempo de ejecución.

La segunda ventaja es su arquitectura orientada a una estructura clara. La inyección de dependencias y los standalone components me permiten separar responsabilidades y evitar acoplamiento. En concreto, esa base es la que sostiene la organización en capas que explico más adelante: separo el dominio de la infraestructura y cada pantalla vive en su propia carpeta de features. Que no sea solo un plan lo confirma la integración con PrimeNG ya activa en `app.config.ts` a través de `providePrimeNG`, donde registré el tema Aura como preset por defecto en el arranque de la aplicación. No es una decisión estética, es una forma de que el código se pueda razonar y mantener.

La tercera, y quizá la más importante para el calendario, es el ciclo de vida. Angular 21 es una versión LTS con soporte activo hasta mayo de 2027, de modo que cubre completo el ciclo de vida del curso. Elegir una versión estable me protege de quedarme a media entrega con una versión sin soporte. No me interesa perseguir la versión más nueva si eso significa arriesgar la estabilidad justo cuando tengo que entregar.

## Componentes de UI: por qué PrimeNG 21

PrimeNG me entrega exactamente el tipo de componentes que un panel administrativo necesita: tablas con ordenamiento y paginación, formularios completos y esquemas de layout. Al usarlo, los controles ya vienen resueltos, accesibles y consistentes entre sí. Puedo enfocar mis horas en armar la lógica del panel y en aplicar el tema Aura, que es el tema moderno por defecto de la librería y que configuré desde el arranque del proyecto.

La decisión de quedarme con la versión 21 y no con la 22 tiene una razón concreta y verificable. PrimeNG cambió hace poco a un modelo de licenciamiento cerrado, con una licencia gratuita pensada solo para uso académico. La versión 22 está salida bajo ese nuevo modelo y su soporte para Angular aún se está estabilizando. En cambio, la versión 21 es la última que se distribuyó bajo el esquema anterior: está madura, sin restricciones y sin ninguna fricción a la hora de configurar la licencia en este entorno de estudio. Esa tranquilidad vale más que la novedad de la última versión.

## Backend: por qué Supabase

Supabase no fue una opción elegida de entre varias posibles. Me decidí por un proyecto que ya existe y que funciona. Ese mismo proyecto de Supabase sirve al ecosistema de wearable, teléfono y TV de la otra materia, y ya tiene el esquema de mascotas definido: `pets`, `care_logs`, `vaccinations`, `weight_logs` y `vet_appointments`, cada una con sus políticas de seguridad a nivel de fila (RLS) configuradas.

Reutilizar ese proyecto tiene una implicación práctica que valoro mucho: no duplico infraestructura y mantengo una sola fuente de verdad entre todos los proyectos del ecosistema. Lo que este panel muestra es exactamente lo que las otras aplicaciones guardan, sin sincronizaciones manuales ni copias de datos. Políticas y esquema no los defino yo desde cero: ya están y funcionan en el proyecto.

Quiero aclarar un punto de seguridad: las políticas de lectura pública que ya existen, pensando en la Smart TV del ecosistema, me dejan a este panel leer los datos reales desde el primer día, sin fricción. Para la funcionalidad de hoy no tuve que cambiar nada. Y si más adelante agrego capacidad de escritura o un rol de administración, lo haré de forma aditiva, sumando políticas nuevas sin tocar las que ya protegen a las otras aplicaciones. De esa forma, no rompo el acceso con el que el resto del ecosistema ya funciona.

Ese cuidado por el manejo de credenciales también se nota en el código: el cliente de Supabase en `core/supabase/supabase.client.ts` lanza un error explícito si las variables de entorno no están configuradas, en lugar de fallar en silencio con un error opaco más adelante. Preferí que la configuración incompleta se hiciera evidente apenas se intente la conexión, lo cual confirma que el manejo de entornos fue una decisión deliberada y no un descuido.

## Posibilidad de escalado

La arquitectura que elegí está pensada para crecer sin volver a construir lo que ya existe. Separo el dominio de la infraestructura siguiendo Clean Architecture: los modelos y las reglas del negocio residen de un lado, y las implementaciones concretas de Supabase residen del otro. Si en algún momento decidiera cambiar de backend, solo reemplazo los adaptadores que están en `infrastructure/`; la lógica de negocio de `core/` ni se daría cuenta del cambio. Ese desacople convierte algo que normalmente es arriesgado, como migrar de base de datos, en un cambio acotado a una sola capa.

Del lado Angular, uso lazy loading de rutas para agregar cada feature nueva en un chunk que solo se carga cuando se necesita. Así el bundle de la primera pantalla se mantiene liviano y las nuevas capacidades del panel no castigan el tiempo de carga inicial. En cuanto al backend, Supabase escala de forma administrada y se encarga de la operación de servidores: el equipo no tiene que montar ni cuidar infraestructura propia para que el proyecto crezca en usuarios o datos.

## Posibilidad de reversionamiento

Angular tiene un ciclo de versiones semestral y previsible, cada salto de versión llega con una ruta de actualización documentada. El comando `ng update` me migra el código y las configuraciones de forma relativamente guiada, así que cuando más adelante haya que subir de versión, existe un camino conocido y probado que seguir. No es un esfuerzo improvisado de mantener el proyecto al día.

El proyecto también se gobierna con un control de versionado ordenado: usé git para llevar el historial de cada cambio que voy haciendo y, aunque todavía no he hecho el primer commit, el repositorio queda listo para partir de ahí. Me queda también la decisión de fijarme en Angular 21 en vez de perseguir la última versión recién publicada: eso me da más margen de tiempo antes de que llegue la siguiente migración. Así reduzco el riesgo de que una actualización rompa el proyecto a mitad del curso y en el peor momento.

---

## Nota sobre decisiones técnicas detectadas en el proyecto

Mientras revisaba `package.json`, `angular.json` y la estructura de carpetas para esta actividad, identifiqué dos puntos que no estaban contemplados en el prompt y que creo que vale la pena hacer visibles en el documento:

1. Las credenciales de Supabase no están escritas en el código: se inyectan desde los archivos `src/environments/environment.ts` y `environment.prod.ts`, que están excluidos del control de versiones. Solo se versiona una plantilla `environment.example.ts` a partir de la cual hay que copiar y pegar. Cualquiera que retome el proyecto sabe cómo configurar su propia instancia sin una filtración de claves.

2. La separación puerto-adaptador está materializada en el código: en `core/` definí interfaces abstractas como "puertos" que describen qué necesita el panel, y en `infrastructure/` implementé los "adaptadores" concretos sobre Supabase. Esa materialización es justamente el punto 5 que escribí, y creo que refuerza que no se trata de una idea teórica, sino de algo implementado desde la base del proyecto.
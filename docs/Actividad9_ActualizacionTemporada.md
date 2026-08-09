# Actividad 9 — Evento JavaScript para actualización de temporada

## Qué es una "actualización de temporada" en este contexto

Cuando se habla de que un sitio cambie de "temporada", lo común es pensar en un ajuste de tema visual que sigue las estaciones del año: colores más cálidos en otoño, tonos fríos en invierno y así por el estilo. Ese enfoque, aunque vistoso, tiene un problema de fondo: la estación es arbitraria y no dice nada del negocio. Para este panel decidí no seguir ese camino y en su lugar interpreté la "temporada" como un evento genuinamente calendarizado y respaldado por datos reales: la proximidad de una cita veterinaria.

La idea central es que el sitio se actualiza a sí mismo cuando llega el momento en que una mascota tiene cita con el veterinario dentro de una ventana próxima. Eso convierte la temporada en algo dinámico, que se activa solo cuando el negocio lo exige y no en una fecha fija del calendario. Si una mascota no tiene cita, el panel permanece en su estado de bienvenida; en cuanto aparece una cita próxima, la interfaz cambia para avisarle al encargado. La temporada, entonces, la define la información real que ya vive en Supabase, no una suposición mía.

## El evento JavaScript en sí

El mecanismo que sostiene esta actualización es un signal computed llamado `banner()` que vive en `dashboard.component.ts`. Un computed de Angular es una función derivada que se re-evalúa automáticamente cada vez que cambian los signals de los que depende, y esa característica es justamente la que convierte esto en un evento reactivo: no hay nadie disparando manualmente el re-render, el propio marco de trabajo detecta el cambio y vuelve a calcular el resultado.

El flujo de datos es el siguiente. El adaptador `SupabaseAppointmentsRepository`, que está en `infrastructure/`, consulta la tabla `vet_appointments` de Supabase pidiendo únicamente las citas con `status = 'pendiente'` y con fecha a partir de hoy, ordenadas de forma ascendente. Esa consulta se expone a través del puerto `AppointmentsRepository` que vive en `core/ports/`, y el dashboard consume el puerto en lugar de llamar a Supabase directamente; así la lógica de la pantalla queda desacoplada de la infraestructura. Cuando el componente carga, suscribe la respuesta de `listPending()` y guarda la primera cita del arreglo en el signal `nextAppointment()`.

Después, `banner()` lee ese signal y compara la fecha de la cita contra la fecha de hoy. La diferencia de días se calcula dentro de un método auxiliar llamado `isWithinDays()`, que normaliza ambas fechas a medianoche y revisa si la cita cae entre hoy y hoy más la ventana configurada. Como `banner()` depende de `nextAppointment()`, cualquier cambio en ese signal hace que Angular recalcule el computed de inmediato, sin intervención manual. El resultado es un objeto con `severity` y `text`, que el template de la pantalla consume a través de un componente `p-message` de PrimeNG.

## Detalle de la actualización: los dos estados

La interfaz tiene dos estados bien definidos, y el cambio entre ellos es lo que yo entiendo como la actualización de temporada.

El primero es el estado normal. Cuando no hay una cita próxima, el banner se pinta con `severity = "info"` y muestra un mensaje de bienvenida que además lleva el conteo de mascotas registradas en el sistema, por ejemplo "Bienvenido al panel — actualmente hay 2 mascotas registradas". Este es el estado por defecto, el que el encargado ve en el día a día cuando no hay nada urgente que atender.

El segundo es el estado de temporada activa. Cuando sí hay una cita pendiente dentro de los próximos siete días, el banner cambia a `severity = "warn"` y el mensaje se vuelve dinámico: incluye el motivo de la cita y su fecha formateada, por ejemplo "Tienes una cita veterinaria próxima: Cortar pelo el 11/8/2026". El cambio de severidad también altera la apariencia visual del mensaje, con el color de advertencia que el tema Aura asigna al estado `warn`, de modo que el aviso salta a la vista.

El umbral de los siete días fue una decisión de diseño razonada. Siete días dan margen para que el aviso tenga utilidad real como alerta anticipada, pero no tanto como para que pierda urgencia; con una ventana menor, el encargado apenas tendría tiempo de reaccionar, y con una mayor, el aviso se volvería tan cotidiano que dejaría de significar algo. Ese rango quedó codificado en la constante `nextAppointmentWindowDays = 7` dentro del propio componente, así el umbral es ajustable desde un solo lugar si el criterio del negocio cambia más adelante.

## Evidencia de la verificación real

Esta funcionalidad se probó contra datos reales de Supabase, no contra una simulación. Inserté manualmente una cita en la tabla `vet_appointments` con fecha dentro de los próximos días y, al cargar el dashboard, el banner disparó correctamente el estado `warn` con el mensaje de aviso y su fecha. Después alejé esa fecha fuera de la ventana de los siete días y el banner regresó al estado `info` de bienvenida, lo que confirmó que la lógica reacciona en ambas direcciones.

Durante esa verificación apareció un detalle interesante que vale la pena dejar registrado. En un primer intento el banner no cambiaba a `warn` aunque había insertado una cita "reciente", y la tentación era asumir un bug en el código. Al revisar la respuesta real de la API en la pestaña Network del navegador, el diagnóstico fue otro: la cita que había insertado tenía su `appointment_date` a once días de distancia, es decir, fuera del rango de los siete días. No era un error de la lógica sino un dato de prueba incorrecto; el computed calculaba los once días de diferencia y, con toda razón, devolvía el estado `info`. Ese mismo contraste, ver la cita dentro y fuera de la ventana con la respuesta real a la vista, fue lo que terminó de confirmar que el mecanismo funciona como debe.

## Referencia al control de versiones

Este cambio quedó trazado en la historia del repositorio en el commit `03bb7ceebdf80a6f753de510fa2fa22d9a366158`, cuyo mensaje agrupa las actividades uno a ocho del proyecto, incluido el banner de citas calendarizadas. Los archivos directamente relacionados con esta funcionalidad dentro de ese commit son los siguientes:

- `src/app/core/ports/appointments.repository.ts`, el puerto que define `listPending()`.
- `src/app/infrastructure/supabase-appointments.repository.ts`, el adaptador que consulta la tabla `vet_appointments`.
- `src/app/core/models/vet-appointment.model.ts`, el modelo de la cita veterinaria.
- `src/app/features/dashboard/dashboard.component.ts`, donde viven `nextAppointment()`, `banner()` e `isWithinDays()`.
- `src/app/features/dashboard/dashboard.component.html`, que renderiza el banner con el componente `p-message`.
- `src/app/features/dashboard/dashboard.component.scss`, con el estilo visual del banner.

Esos archivos forman parte del mismo commit inicial en el que se levantó todo el scaffold del proyecto, así que la trazabilidad de la funcionalidad queda asegurada dentro del historial real del repositorio.

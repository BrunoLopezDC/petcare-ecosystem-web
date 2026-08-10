# Actividades 11 y 12 — Módulo administrativo de usuarios

## 1. Manual de usuario

### Cómo lo usa un usuario normal

Entrar al sistema es sencillo: en la pantalla de login escribes tu correo y tu contraseña y pulsas "Iniciar sesión". El botón permanece atenuado (deshabilitado) mientras los campos estén vacíos o el correo no tenga un formato válido, así que no puedes enviar el formulario a medias. Si el usuario que usas tiene una sesión activa de un intento anterior, el panel te lleva directo al inicio sin pedirte nada.

Una vez dentro, desde el menú lateral entras a "Mi perfil". Ahí puedes cambiar tu nombre completo: borras el texto del campo "Nombre completo", escribes el nuevo y pulsas "Guardar cambios". El cambio se refleja de inmediato y contrasta el resultado con un mensaje de confirmación, o con uno de error si la conexión falló.

Para cambiar la contraseña, el mismo panel de "Mi perfil" tiene una sección "Cambiar contraseña" con dos campos: la nueva y su confirmación. Mientras escribes la nueva, debajo del campo aparece una lista de requisitos con un ícono de palomita o de cruz que se va actualizando en tiempo real. La contraseña debe cumplir cinco condiciones para ser aceptada: tener al menos 8 caracteres, incluir al menos una letra mayúscula, al menos una minúscula, al menos un número y al menos un símbolo especial (un carácter que no sea letra ni número). El botón "Cambiar contraseña" solo se habilita cuando todos los puntos están en verde y las dos contraseñas coinciden; si escribes mal la confirmación aparece un mensaje indicando que no coinciden. Cuando el sistema la acepta, cierra la sesión de tu cuenta en el esquema de autenticación y confirma el cambio con un mensaje de éxito.

### Cómo lo usa un administrador

El administrador hace todo lo anterior y además tiene tres secciones exclusivas en el menú lateral: "Usuarios", "Roles y Permisos" y "Auditoría". Estas solo aparecen cuando el perfil tiene rol `admin`.

En "Usuarios" ves la lista completa de cuentas del sistema en una tabla con nombre, correo, rol, estado y fecha de alta. Cada fila tiene un menú de acciones con tres opciones:

- **Cambiar rol**: abre un diálogo con un selector entre "Admin" y "Usuario". Al confirmar, el perfil queda guardado con el nuevo rol. Un usuario normal no puede cambiar su propio rol desde esta pantalla (la opción está deshabilitada para quien mira la lista).
- **Desactivar / Activar**: alterna el estado de la cuenta. Una cuenta desactivada queda marcada como inactiva, aunque el administrador todavía la ve en la lista.
- **Eliminar**: borra la cuenta de forma lógica. Es importante entender que esto no destruye sus datos: la fila deja de mostrarse en la lista porque se marca con una fecha de eliminación, pero la información permanece en la base de datos. Si algún día se necesita, sigue existiendo. El checkbox "Mostrar eliminados" de la misma pantalla permite ver esas cuentas ocultas.

En "Roles y Permisos" ves una matriz con las cuatro acciones sensibles del sistema (gestionar usuarios, gestionar roles, consultar la bitácora y ver el propio perfil) en filas, y los roles "Admin" y "Usuario" en columnas. Activando o desactivando los checkboxes de la matriz modificas qué puede hacer cada rol. La pantalla incluye una nota que aclara algo importante: ese catálogo es de referencia y documental; las decisiones reales de acceso hoy se basan en el campo `role` de cada perfil, así que cambiar la matriz no altera por sí solo el comportamiento de los guards ni de la base de datos.

En "Auditoría" consultas el historial de acciones del sistema. La pantalla muestra una tabla con la fecha, el usuario, el correo, la acción y la IP del evento. Tienes dos herramientas para filtrar: un selector de "Acción" en el que eliges un tipo (inicio de sesión, cierre de sesión, cambio de contraseña, usuario creado, usuario eliminado o cambio de rol) y un buscador libre donde tecleas parte de un correo para filtrar los resultados. Puedes usar ambas a la vez: primero se filtra por tipo de acción y luego el buscador acota todavía más. Cada fila permite abrir un diálogo con los detalles del evento.

### Qué pasa con la sesión y con los intentos fallidos

Hay dos comportamientos de seguridad que conviene conocer. Si un usuario permanece inactivo quince minutos seguidos (sin mover el mouse, teclear o hacer clic), el sistema muestra un aviso un minuto antes de que la sesión expire, con la opción "Seguir conectado" que reinicia el temporizador. Si no se responde, la sesión se cierra sola y el usuario vuelve a la pantalla de login con un mensaje informativo: "Tu sesión expiró por inactividad. Inicia sesión de nuevo".

Por otro lado, si alguien intenta entrar con una contraseña incorrecta cinco veces en menos de quince minutos, el sistema bloquea temporalmente el login para ese correo y muestra: "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en unos minutos". El bloqueo es automático: a partir del sexto intento el sistema ni siquiera consulta la contraseña, solo informa que la cuenta está bloqueada.

## 2. Manual técnico

### Arquitectura

Todo el módulo administrativo sigue el patrón puerto/adaptador. La lógica de cada pantalla depende de una interfaz abstracta que vive en `src/app/core/ports/`, y la implementación concreta que habla con Supabase vive en `src/app/infrastructure/`. Los componentes nunca importan el adaptador directamente en su lógica de negocio: inyectan el puerto y resuelven a la implementación con la inyección de dependencias de Angular. Esto permite cambiar el respaldo de datos (por ejemplo, pasar a una API propia) sin tocar las pantallas.

Los puertos del módulo y la tabla de Supabase que consulta cada uno, según el código real:

- **`profiles.repository.ts`** (interfaz `ProfilesRepository`) → tabla `profiles`. Expone lectura y edición del perfil propio (`getMine()`, `updateMine()`) y las operaciones administrativas (`listAll()`, `updateRole()`, `toggleActive()`, `softDelete()`). Su adaptador es `supabase-profiles.repository.ts`.
- **`audit-log.repository.ts`** (interfaz `AuditLogRepository`) → tabla `audit_log`. Expone `insert()`, que registra acciones, e `listAll()`, que trae el historial completo. Su adaptador es `supabase-audit-log.repository.ts`.
- **`permissions.repository.ts`** (interfaz `PermissionsRepository`) → tablas `permissions` y `role_permissions`. Expone el catálogo (`listPermissions()`), las asignaciones rol→permiso (`listRolePermissions()`) y el toggle por celda (`togglePermission()`). Su adaptador es `supabase-permissions.repository.ts`.
- **`login-attempts.repository.ts`** (interfaz `LoginAttemptsRepository`) → tabla `login_attempts`. Expone el conteo de fallos recientes (`countRecentFailures()`) y el registro de cada intento (`recordAttempt()`). Su adaptador es `supabase-login-attempts.repository.ts`, único en el proyecto que consulta la base sin sesión activa (solo con la anon key).

Además de los puertos hay tres servicios en `src/app/core/services/`: `profile.service.ts` mantiene el estado global del perfil autenticado en un signal; `client-ip.service.ts` captura la IP pública best-effort para los registros de auditoría de login; y `session-timeout.service.ts` gestiona el cierre por inactividad. Los validadores en `src/app/core/validators/` (`password-policy.validator.ts` y `must-match.validator.ts`) son las ValidatorFn de la política de contraseña y de la confirmación.

### Esquema de base de datos

Las tablas involucradas, con sus columnas principales tal como las usa el código:

- **`profiles`**: la fila de cada usuario, conectada a Auth por `id` (que coincide con `auth.uid()`). Columnas: `id`, `email`, `full_name`, `role` (valores `admin` y `user`), `active` (booleano), `deleted_at` (nula en cuenta activa) y `created_at`.
- **`permissions`**: el catálogo de permisos. Columnas: `key` (identificador, por ejemplo `manage_users` o `view_audit`) y `description` (texto legible que la matriz muestra debajo de cada clave).
- **`role_permissions`**: la asignación rol→permiso. Columnas: `role` y `permission_key`. Es una tabla de referencia: el acceso real sigue derivado del campo `role` de `profiles`.
- **`audit_log`**: la bitácora. Columnas: `id`, `user_id`, `email`, `action` (los valores `login`, `logout`, `password_change`, `user_create`, `role_change`, `user_delete`), `details` (JSONB con contexto del evento), `ip_address` y `created_at`.
- **`login_attempts`**: los intentos de autenticación. Columnas: `id`, `email`, `success` (booleano) y `attempted_at` (marca de tiempo utilizada para la ventana de 15 minutos).

Sobre las tablas existen triggers que viven en Supabase (es el lado SQL y no se versiona en este repositorio). Los involucrados en este módulo, según las referencias del código:

- **`handle_new_user`**: al crearse una fila nueva en `profiles` (cuando Supabase Auth registra un usuario), se encarga de normalizar el alta; de ahí viene el evento de auditoría `user_create` con los detalles que se ven en la pantalla "Auditoría".
- **`prevent_role_escalation`**: protege las columnas `role` y `active` de `profiles`. Evita que un usuario no admin modifique su propio rol o su estado; por eso `updateMine()` puede actualizar el nombre sin temor a tocar estos campos. El adaptador `supabase-profiles.repository.ts` lo menciona textualmente.
- **`handle_profile_changes`**: dispara los eventos de auditoría relacionados con cambios de perfil, en particular `role_change` cuando se modifica el rol de alguien y `user_delete` cuando se elimina de forma lógica; complementa los eventos `login`, `logout` y `password_change` que el cliente registra.

### Decisión de diseño: gestión de cuentas delegada a Supabase

Hay dos operaciones de administración que deliberadamente no se implementaron dentro del panel: la creación de una cuenta nueva por parte del admin y el reseteo de la contraseña de un tercero. La razón es técnica y de seguridad. Ambas operaciones van contra el servicio de autenticación de Supabase, y ese servicio exige una credencial de tipo *service_role key*. Esa llave tiene acceso irrestricto a la base y puede saltarse por completo las políticas RLS, por lo que nunca debe vivir en el código de una aplicación SPA que cualquiera pueda inspeccionar desde el navegador. Si la incrustamos en el bundle de web-pet, cualquier persona con acceso a las herramientas de desarrollo obtendría control total sobre los datos.

Por eso, en el modelo BaaS de este proyecto, esas acciones privilegiadas se delegan a la consola de administración de Supabase, que es el único lugar donde se acredita esa llave de forma segura (o donde se usan herramientas del lado del servidor con el menor privilegio posible). El panel se queda con todo lo que se puede resolver con la credencial anónima del cliente, respetando el principio de menor privilegio: leer y editar el perfil propio, gestionar roles, activar/desactivar cuentas, eliminación lógica, consultar auditoría y editar el catálogo de permisos. La limitación que sí se reconoce es la del control de intentos fallidos, que al ser un control del lado del cliente en una SPA es real pero no infalible si alguien llama a la API de Supabase sin pasar por esta pantalla; esa aclaración queda documentada en el código.

## 3. Controles de seguridad implementados

### 1. Contraseñas cifradas

El cifrado de las contraseñas lo resuelve Supabase Auth del lado del servidor con bcrypt, y no hay una sola línea de este proyecto que implemente cifrado propio. La aplicación solo envía la contraseña hacia el endpoint de autenticación y nunca la guarda ni la transporta en texto plano dentro del código; en `profile.component.ts` el peor de los casos es pasar la contraseña a `updateUser()` de Supabase, y en `login.component.ts` a `signInWithPassword()`. La responsabilidad de almacenarla cifrada queda fuera del alcance de la SPA.

### 2. Validación de formularios

Los dos formularios sensibles del módulo usan Angular Reactive Forms con Validators. El login (`login.component.ts`) define un `FormGroup` con `Validators.required`, `Validators.email` para el correo y `Validators.minLength(8)` para la contraseña. El cambio de contraseña (`profile.component.ts`) usa la `ValidatorFn` personalizada `passwordPolicyValidator()` y un validador de grupo `mustMatchValidator()` para la confirmación. En ambos, el botón de submit está deshabilitado mientras el formulario sea inválido (`[disabled]="form.invalid"`), de modo que no se puede enviar un formulario incompleto; la validación actúa por campo y en tiempo real, no solo al hacer clic.

### 3. Protección CSRF

El diseño actual mitiga la clase de ataque CSRF sin necesidad de un token adicional. CSRF explota que el navegador adjunta automáticamente las cookies de sesión a cualquier petición dirigida al dominio, incluso si la petición viene de otro sitio. En este proyecto la autenticación viaja en un JWT dentro del header `Authorization: Bearer ...`, no en una cookie ambiental: el token debe agregarse explícitamente en cada petición por el código del cliente. Un sitio malicioso no tiene forma de adjuntarle ese header a una petición hacia nuestra API (CORS y el propio mecanismo lo impiden), así que el vector clásico de "el navegador manda tu sesión sin que tú lo pidas" no aplica.

### 4. Expiración de sesión

`session-timeout.service.ts` escucha eventos de actividad (clic, teclado y movimiento del mouse) con un debounce de un segundo para no reaccionar ante cada píxel de movimiento. Si pasan 15 minutos sin actividad, expira en `inactivityMs = 15 * 60 * 1000` y hace `signOut()` seguido de redirección a `/login` con el mensaje "Tu sesión expiró por inactividad". Un minuto antes (`warningLeadMs`) muestra un aviso con la opción "Seguir conectado" (`keepAlive()`), que reinicia el temporizador desde cero. El servicio solo se activa cuando hay sesión válida y la ruta no es la del login; se sincroniza con `onAuthStateChange` y con los eventos de navegación.

### 5. Bloqueo temporal tras intentos fallidos

Antes de llamar a `signInWithPassword()`, `login.component.ts` consulta `login_attempts` contando los fallos (`success = false`) del correo en los últimos 15 minutos (`FAILURE_WINDOW_MS`). Si son 5 o más (`MAX_FAILURES`), no se intenta el login: se muestra "Cuenta bloqueada temporalmente por múltiples intentos fallidos" y la ejecución se detiene ahí. Después de cada intento real (exitoso o fallido) se inserta una fila con el resultado, vía `SupabaseLoginAttemptsRepository`. La limitación honesta de este control está documentada en el propio código: como es un control del lado del cliente en una SPA sin backend propio, alguien que llame directo a la API de Supabase podría saltarse el bloqueo; es una defensa real para el flujo normal del navegador pero no infalible bajo ese tipo de ataque.

### 6. Política de contraseña segura

La política de contraseña se implementó como `ValidatorFn` en `password-policy.validator.ts` y obliga a: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo especial. En la pantalla "Mi perfil" se muestra como checklist con íconos de palomita/cruz que se actualizan en tiempo real mientras se escribe, no apenas como un mensaje genérico de error al enviar. Es importante aclarar que esta política aplica solo dentro de web-pet: se codificó en el formulario del panel y deliberadamente no se configuró a nivel de Supabase Auth, para no afectar el flujo de registro existente de `phone_app`, que vive en otro repositorio y tiene sus propias reglas.

## 4. Evidencias

El código fuente de todo el módulo es verificable en el repositorio de este proyecto: cada pantalla, puerto, adaptador, servicio y validador descrito en este documento existe en `src/app/`. La base de datos también es verificable en el proyecto de Supabase correspondiente, con las tablas `profiles`, `permissions`, `role_permissions`, `audit_log` y `login_attempts` y los triggers descritos en la sección de manual técnico. Este mismo documento cubre los manuales de usuario y técnico. El video demostrativo del funcionamiento se anexa por separado, grabado por el alumno y colocado en `docs/` o `docs/evidencia/` como material de evidencia audiovisual.

## 5. Referencia de commits

La trazabilidad del desarrollo incremental del módulo, según el historial real del repositorio:

- `03bb7ce` — Actividades 1-8: scaffold Angular+PrimeNG, dashboard con mascotas, layout, DOM demo, administrador de tareas, menú de acciones y banner de citas (base sobre la que se construye el módulo).
- `05caf9b` — Actividad 11-12 Fase B y C1: login con guard de rutas, perfil de usuario (editar nombre, cambiar contraseña) y `adminGuard` listo para la fase siguiente («Login/Perfil»).
- `eb6df81` — Actividad 11-12 Fase C2: gestión de usuarios (listar, cambiar rol, activar/desactivar, eliminación lógica) y sidebar condicional por rol («Gestión de usuarios»).
- `6b35b72` — Actividad 11-12 Parte 3: bitácora de auditoría (triggers SQL para alta/rol/eliminación, registro cliente para login/logout/cambio de contraseña) y pantalla `/auditoria` con filtros («Auditoría»).
- `4416446` — Actividad 11-12 Parte 4: controles de seguridad (política de contraseña, reactive forms, expiración de sesión por inactividad, bloqueo tras intentos fallidos) y el módulo de «Roles y permisos» (`/roles-permisos`, la matriz editable con el catálogo de referencia).

Esos cinco commits cubren completo el alcance de las actividades 11 y 12: inicio de sesión y perfil, administración de usuarios, catálogo de permisos, auditoría y los controles de seguridad, cada fase verificada contra la base de datos real conforme se fue desarrollando.
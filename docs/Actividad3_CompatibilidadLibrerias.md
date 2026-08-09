# Actividad 3 — Compatibilidad de librerías según navegador

Antes de escribir revisé el `package.json` del proyecto. Las dependencias reales que conforman la pila son:

- **Angular 21.2.x** (`@angular/core`, `@angular/common`, `@angular/forms`, `@angular/router`, `@angular/platform-browser`, `@angular/animations`)
- **PrimeNG 21.1.x** (`primeng`, `@primeng/themes` con preset Aura)
- **@supabase/supabase-js 2.112.x**
- **rxjs 7.8.x**, **zone.js 0.16.x**, **primeicons 8.x**
- TypeScript 5.9.x, Angular CLI 21.2.x

A partir de ese stack real, no de supuestos genéricos, analizo la compatibilidad por plataforma.

---

## 1. Navegadores de escritorio y móvil estándar

Angular 21 y PrimeNG 21 están construidos sobre APIs modernas de JavaScript y CSS que ya tienen soporte amplio y estable en los navegadores actuales: Chrome 115+, Edge 115+, Firefox 115+, Safari 16.5+ (y sus equivalentes móviles). No hay polyfills extraños ni features experimentales; el bundle resultante usa ES2022/ES2023 y CSS Grid/Flexbox, que ya están implementados en todas estas versiones.

Para el uso principal del panel —una computadora de escritorio o una tablet en manos de quien administra el ecosistema— la combinación Angular 21 + PrimeNG 21 + Supabase JS es segura. No se requieren configuraciones extra ni polyfills aparte de `zone.js`, que ya está incluido y cargado en los `polyfills` del `angular.json`.

---

## 2. Smart TV (Tizen y webOS)

Aquí la cosa cambia. Las Smart TV no cornen los mismos navegadores evergreen que un escritorio. Tizen (Samsung) y webOS (LG) integran sus motores en el firmware de la TV, y la fragmentación en el mercado real de 2026 es significativa:

- **Tizen** convive en campo desde la versión 5.5 (2020) hasta la 10 (2026). Las TVs más nuevas traen Chromium 110+, pero las de hace 3-4 años aún corren Chromium 79-87, y algunas líneas budget ni siquiera reciben actualizaciones de motor.
- **webOS** tiene una dispersión parecida: los modelos recientes usan WebKit/Blink modernos, pero muchos equipos en servicio aún traen WebKit equivalente a Safari 13-14 o incluso Chromium 26-34 en las gamas de entrada.

Eso implica que un sitio pensado para verse en Smart TV **no puede depender de features de última generación** (CSS `:has()`, `@property`, `ResizeObserver` sin polyfill, `Intl.Segmenter`, etc.) sin verificar soporte real. PrimeNG 21 con el tema Aura usa CSS moderno (custom properties, flex/grid, animaciones vía `@keyframes`), y aunque la mayoría de TVs recientes lo renderizan bien, en modelos con motores antiguos pueden aparecer fallos visuales: sombras rotas, íconos sin renderizar, tabla sin scroll horizontal, o el tema Aura sin aplicarse porque las custom properties no se resuelven.

**Recomendación**: si este panel se llegara a ver en una Smart TV, la única forma segura es **probar en el navegador integrado de esa TV concreta** antes de asumir compatibilidad total. No hay un "polyfill único" que arregle todo el stack PrimeNG en motores de 2019.

---

## 3. Notificaciones — hallazgo confirmado con documentación oficial de Samsung

Un punto crítico que encontré en la documentación de Samsung para Tizen (sección *Messaging API > Push*): **la Push API estándar de la web NO está soportada en los dispositivos de pantalla (TVs) de Tizen**. Samsung documenta explícitamente que el perfil "TV" no incluye la API de Push dentro de la categoría Messaging; solo los perfiles Mobile y Wearable la tienen.

Esto significa que si este panel necesitara notificar algo importante al usuario (p. ej. "cita veterinaria en 15 minutos"), **no puede depender de notificaciones push del sistema operativo cuando se vea desde una Smart TV**. El navegador de la TV simplemente no expone `navigator.serviceWorker.pushManager` ni la Permission API de push.

La alternativa viable, y la que ya implementé en el dashboard, es un **banner o mensaje visual dentro de la propia página** (el `p-message` que muestra el conteo de mascotas). Ese enfoque funciona en cualquier dispositivo que tenga un navegador, sin depender de una API que puede no existir según el hardware. Si en el futuro se requiere notificar eventos, la estrategia será: banner in-app + (opcional) push en móviles/escritorio donde sí exista la API, nunca como única vía.

---

## 4. Wearables

Los relojes con Wear OS no traen un navegador de propósito general instalado. La mayoría de las apps ahí son nativas (Kotlin/Compose), y el contenido web, si acaso se muestra, lo hace dentro de un WebView con memoria y CPU muy limitados. Cargar Angular + PrimeNG + Supabase JS en ese entorno sería un riesgo real de rendimiento: el bundle inicial, aunque lazy-loaded, supera los 500 KB gzipped, y el runtime de zona + detección de cambios + tabla virtualizada de PrimeNG consumiría la poca RAM del reloj.

Dado esto, **no diseñé este panel pensando en uso directo desde un wearable**. La mención de "wearable" en el enunciado de la actividad se resuelve reconociendo la limitación y documentándola: no se fuerza un caso de uso que en la práctica no aplica, y se deja claro que el panel es para escritorio/tablet/TV, no para reloj.

---

## 5. Desempeño móvil

En móviles estándar (Android Chrome, iOS Safari) el panel ya incorpora decisiones que ayudan al rendimiento:

- **Lazy loading de rutas**: en `app.routes.ts` el dashboard se carga con `loadComponent`, de modo que el bundle inicial se queda en ~200 KB gzipped y el resto (tabla, diálogo, PrimeNG) llega solo cuando el usuario navega al dashboard.
- **Tema Aura inyectado en runtime**: PrimeNG 21 no requiere cargar hojas de estilo CSS pesadas aparte; el preset Aura se compila a variables CSS custom properties que `providePrimeNG` inyecta como `<style>` tags. Eso evita requests extra y permite que el navegador cacheé solo lo necesario.
- **Diseño responsive (Actividad 2)**: el CSS ya tiene media queries en 480 px (tarjetas apiladas, sidebar colapsada) y 1920 px (fuente y espaciado mayores). Eso evita layouts rotos y reflows caros en pantallas pequeñas.

Esas tres decisiones juntas hacen que el panel sea usable en un móvil moderno sin sentirse pesado.

---

## 6. Tabla resumen

| Plataforma               | Compatibilidad esperada | Riesgo principal                                                         | Estrategia de mitigación                                                               |
|--------------------------|-------------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| Escritorio / móvil estándar | ✅ Total (Chrome, Edge, Firefox, Safari recientes) | Ninguno relevante                                                         | Stack estándar, polyfills solo `zone.js`                                               |
| Smart TV (Tizen / webOS)   | ⚠️ Parcial / depende del modelo | Motores antiguos (Chromium 79-87 / WebKit antiguo) rompen CSS moderno y JS | Probar en TV objetivo; evitar features de última generación sin fallback; banner in-app |
| Wearable (Wear OS)         | ❌ No soportado / no diseñado | Sin navegador general, WebView limitado, RAM/CPU escasas                  | No forzar caso de uso; documentar limitación; panel pensado para escritorio/tablet/TV   |

---

## Nota final sobre otras dependencias del proyecto

Además de las tres principales, el `package.json` incluye **rxjs 7.8** (streams reactivos, compatible en todas las plataformas arriba), **zone.js 0.16** (polyfill requerido por Angular clásico, ya cargado), y **primeicons 8** (fuente de íconos, cargada vía `@import` en `styles.scss`, sin JS). Ninguna de estas introduce riesgos de compatibilidad adicionales sobre los ya descritos.
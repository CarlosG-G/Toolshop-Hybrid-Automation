# Guía del proyecto: qué hay, para qué sirve y por dónde empezar

Este repositorio **prueba una tienda; no implementa la tienda**. Toolshop es la
aplicación bajo prueba, también llamada **SUT** (_System Under Test_). El código
propio prepara escenarios, controla navegadores, comprueba respuestas y convierte
las observaciones en evidencias legibles.

Playwright lleva la regresión principal. Vibium añade comprobaciones semánticas
independientes. «Hybrid» significa que un recorrido puede pasar una URL de un
navegador Playwright a otro Vibium: no comparten automáticamente cookies ni sesión.
La justificación está en [ADR 001](adr/001-tool-selection.md).

## Ruta de lectura de diez minutos

1. Lee un escenario: [búsqueda de productos](../tests/e2e/catalog.spec.ts).
2. Sigue sus acciones a [CatalogPage](../src/pages/catalog.page.ts): contiene
   selectores y esperas, no la decisión de si el resultado de negocio es correcto.
3. Mira el [cliente API](../src/api/toolshop-api.ts) y las
   [fixtures](../tests/support/api-fixtures.ts): evitan repetir HTTP y preparación.
4. Comprueba los [permisos de ejecución](../tests/support/gates.ts) y la
   [configuración](../src/config/env.ts) antes de ejecutar contra un entorno.
5. Sigue una observación hasta el [normalizador](../src/reporting/playwright.ts)
   y el [modelo de informe](../src/reporting/model.ts).
6. Abre el [dashboard publicado](https://carlosg-g.github.io/Toolshop-Hybrid-Automation/).
   Distingue resultados actuales, defectos conocidos y evidencias nocturnas.

En VS Code, pasa el cursor sobre un método para ver su resumen JSDoc; usa
**F12** para ir a la definición y **Shift+F12** para buscar referencias.
La ayuda explica acciones, esperas, resultados y errores relevantes. Se mantiene
en inglés, como el código y los documentos técnicos existentes; esta guía ofrece
el recorrido en español. Los callbacks anónimos de `test`, eventos y `map` se
leen dentro del escenario al que pertenecen.

## Mapa de responsabilidades

| Ubicación                                                     | Qué contiene y por qué está separada                                                                                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/config/env.ts](../src/config/env.ts)                     | Resuelve destino y URLs. Calcula si se permiten escrituras; no convierte una URL pública en segura por llamarla «local».                                             |
| [src/api/toolshop-api.ts](../src/api/toolshop-api.ts)         | Cliente REST tipado. Centraliza cabeceras, token, codificación de IDs y diagnósticos HTTP.                                                                           |
| [src/api/openapi-contract.ts](../src/api/openapi-contract.ts) | Valida cuerpos contra el OpenAPI del proveedor con Ajv. Reutiliza validadores compilados por operación, estado y tipo de contenido.                                  |
| [src/data/factories.ts](../src/data/factories.ts)             | Genera identidades sintéticas únicas y fechas de frontera. Evita depender del orden de ejecución o de cuentas compartidas.                                           |
| [src/data/payments.ts](../src/data/payments.ts)               | Ejemplos válidos y particiones inválidas de pago. Son datos de prueba, no tarjetas ni pagos reales.                                                                  |
| [src/pages](../src/pages)                                     | Page Objects: acciones sobre catálogo, producto, carrito, login, registro y checkout. Aíslan cambios de interfaz.                                                    |
| [src/vibium](../src/vibium)                                   | Sesión Chrome, viewport y comprobaciones semánticas propias de Vibium; no mezcla sus elementos con locators Playwright.                                              |
| [src/reporting](../src/reporting)                             | Modelos, validación de evidencias, clasificación de resultados, cobertura, historial y presupuestos de calidad. No controla la tienda.                               |
| [tests/support](../tests/support)                             | Preparación compartida, restricciones de entorno y reconocimiento estricto de defectos conocidos. No es comportamiento del producto.                                 |
| [tests/fixtures](../tests/fixtures)                           | Tienda falsa y firmas de defectos para pruebas controladas. No sustituye a Toolshop en las pruebas integradas.                                                       |
| [scripts](../scripts)                                         | Entradas ejecutables para entornos, selección de suites y construcción de evidencias. No deben importarse indiscriminadamente: algunos ejecutan trabajo al cargarse. |
| [dashboard/index.html](../dashboard/index.html)               | Vista estática de evidencias publicadas. Construye nodos DOM sin interpretar valores del informe como HTML.                                                          |
| [docker](../docker)                                           | Compose y proxy para levantar un Toolshop local desechable. Es infraestructura de prueba, no un despliegue de producción.                                            |
| [docs/test-management](test-management)                       | Plan, estrategia, requisitos, trazabilidad, defectos, sesiones y cierre de ciclo. Explican qué se prueba y qué riesgo queda.                                         |
| [charters](../charters)                                       | Guiones de exploración manual. Complementan la automatización con preguntas y observaciones humanas.                                                                 |
| [.github/workflows](../.github/workflows)                     | Automatiza validaciones, suites aisladas, publicación, análisis y mantenimiento.                                                                                     |
| [reports](../reports)                                         | Salidas generadas. Normalmente no se versionan; en CI se conservan como artefactos.                                                                                  |

### Qué hace cada Page Object

- [CatalogPage](../src/pages/catalog.page.ts): abrir, esperar productos, buscar y
  localizar enlaces. La búsqueda espera la respuesta `QUERY` real del proveedor.
- [ProductPage](../src/pages/product.page.ts): abrir el primer producto renderizado,
  consultar cantidad y añadirlo al carrito. «Primero» no garantiza stock de negocio.
- [CartPage](../src/pages/cart.page.ts): abrir un carrito con productos y avanzar
  a checkout. Su espera presupone un carrito no vacío.
- [LoginPage](../src/pages/login.page.ts): `attempt` permite comprobar errores;
  `signIn` además espera la navegación autenticada.
- [RegisterPage](../src/pages/register.page.ts): rellenar, enviar y examinar
  errores. `register` espera el POST; `submit` también sirve cuando la validación
  del navegador impide enviarlo. La comprobación ARIA detecta errores sin enlazar
  con su campo.
- [CheckoutPage](../src/pages/checkout.page.ts): avanza por dirección y pago.
  Espera todas las consultas de código postal y comprueba el autocompletado.
  `checkPayment` y `confirmOrder` usan el mismo botón en **estados distintos**:
  pago aceptado no equivale todavía a pedido creado.

Un **locator** es una consulta diferida: devolverlo no demuestra que el elemento
exista ni que sea visible. La prueba usa `expect(...).toBeVisible()`, `toHaveText()`
u otra aserción adecuada. Así se conservan las esperas y los diagnósticos de Playwright.

## Qué demuestra cada familia de pruebas

| Carpeta                                               | Pregunta que responde                                                                                            | Dependencias                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [unit](../tests/unit)                                 | ¿Se calculan y validan bien configuración, informes y reglas? Incluye pruebas de scripts en procesos temporales. | Node; algunas pruebas de healthcheck usan navegador y un servidor local.         |
| [mocked](../tests/mocked)                             | ¿Funcionan páginas, accesibilidad y dashboard con respuestas controladas?                                        | Chromium y fixtures/interceptaciones locales; sin Toolshop real.                 |
| [hermetic](../tests/hermetic)                         | ¿Puede Playwright pasar una URL a Vibium en un recorrido controlado?                                             | Navegadores de ambas herramientas y tienda falsa local.                          |
| [api](../tests/api)                                   | ¿Respeta la API los resultados de negocio, límites y errores esperados?                                          | API real; las escrituras exigen SUT local.                                       |
| [contract](../tests/contract)                         | ¿Coinciden las respuestas con los esquemas publicados por el proveedor?                                          | API y OpenAPI del SUT; no basta con que devuelva HTTP 200.                       |
| [e2e](../tests/e2e)                                   | ¿Completa una persona el recorrido desde la interfaz real?                                                       | SUT; los flujos que crean datos usan el entorno desechable.                      |
| [features](../tests/features)                         | ¿Se cumple el comportamiento descrito en Given/When/Then?                                                        | Escenarios Gherkin y pasos Playwright; se generan antes de ejecutar BDD.         |
| [hybrid](../tests/hybrid) y [vibium](../tests/vibium) | ¿Se conservan los oráculos semánticos en otro navegador y controlador?                                           | Vibium y destino explícitamente habilitado.                                      |
| [nonfunctional](../tests/nonfunctional)               | ¿Cumple accesibilidad, respuesta, adaptación y resiliencia?                                                      | Según escenario; no reemplaza una auditoría humana completa.                     |
| [visual](../tests/visual)                             | ¿Cambió una captura respecto a su referencia?                                                                    | Navegador y sistema operativo de la referencia; las baselines del SUT son Linux. |
| [load](../tests/load)                                 | ¿Cumple el catálogo los umbrales con usuarios concurrentes?                                                      | k6 y SUT en loopback; nunca cargar el sitio público.                             |
| [security](../tests/security)                         | ¿Se rechazan peticiones no autorizadas y qué observa el escaneo pasivo?                                          | SUT; no constituye una certificación de seguridad.                               |

**Hermético** significa independiente de servicios externos, no «sin navegador»
ni «sin HTTP local». Una prueba mocked verde no demuestra que el proveedor real
funcione: por eso existen también contratos y recorridos con SUT.

## Entornos y protecciones

La [configuración](../src/config/env.ts) parte de `stable`, `with-bugs` o `local`.
`TOOLSHOP_SITE_URL` y `TOOLSHOP_API_URL` permiten sobreescribir sus URLs.
La configuración se lee al importar el módulo: define variables **antes** de lanzar
el proceso, no a mitad de una prueba.

- `TOOLSHOP_LIVE=1` habilita las suites opt-in; no concede permiso de escritura.
- Solo se permiten escrituras cuando el target es `local` **y ambas URLs**
  son HTTP(S) de loopback (`localhost`, `127.0.0.1` o `[::1]`).
- Estas restricciones pertenecen a los runners, fixtures y gates. El cliente API
  es una capa HTTP, no una barrera de seguridad para scripts arbitrarios.
- Las cuentas sembradas solo son fiables en la instancia desechable.
- Reiniciar datos con `sut:reset` borra la base local. `sut:down` elimina también
  los volúmenes del stack. No uses estos comandos en una instancia compartida.

Para empezar sin Docker ni proveedor externo:

```powershell
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm run test:hermetic
```

Para integración, usa las instrucciones de [Quick start](../README.md#quick-start)
y la selección de suites del [README](../README.md#test-suites).
`npm run test:local -- --project=api` selecciona solo el proyecto API del SUT ya
levantado. `npm test` no significa «todas las integraciones reales»: las suites
opt-in pueden omitirse si falta la habilitación.

## Inventario de scripts y configuración

| Entrada                                                                                                                 | Función                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [playwright.config.ts](../playwright.config.ts)                                                                         | Asigna archivos a proyectos, configura reintentos, evidencias y servidor falso. La matriz Firefox/WebKit es opt-in.  |
| [playwright.mutation.config.ts](../playwright.mutation.config.ts) y [stryker.config.json](../stryker.config.json)       | Seleccionan unidades puras y presupuestos para comprobar si las pruebas detectan cambios deliberados en el código.   |
| [tsconfig.json](../tsconfig.json), [.oxlintrc.json](../.oxlintrc.json), [.prettierrc.json](../.prettierrc.json)         | Tipado estricto, reglas de errores/antipatrones y formato. Cada herramienta tiene una responsabilidad distinta.      |
| [package.json](../package.json) y [package-lock.json](../package-lock.json)                                             | Comandos y dependencias; el lock fija la instalación reproducible.                                                   |
| [sut.mjs](../scripts/sut.mjs)                                                                                           | Levanta, espera, siembra, reinicia o elimina exclusivamente el stack de pruebas configurado.                         |
| [run-target.mjs](../scripts/run-target.mjs)                                                                             | Selecciona target, habilita live y limita workers por defecto; transmite argumentos y código de salida a Playwright. |
| [check-target.mjs](../scripts/check-target.mjs)                                                                         | Diagnostica disponibilidad HTTP/API y navegación pública con el perfil Chrome de la suite. No prueba contratos.      |
| [run-browser-matrix.mjs](../scripts/run-browser-matrix.mjs)                                                             | Comprueba disponibilidad y ejecuta la matriz live/mocked con varios navegadores.                                     |
| [select-test-suite.mjs](../scripts/select-test-suite.mjs)                                                               | Traduce la selección de GitHub Actions en jobs y fuentes de informes; no es un runner local general.                 |
| [mock-shop-server.mjs](../scripts/mock-shop-server.mjs)                                                                 | Sirve la tienda falsa en el puerto 4173 y su healthcheck para pruebas sin Toolshop.                                  |
| [build-traceability.ts](../scripts/build-traceability.ts)                                                               | Cruza IDs de pruebas con requisitos y cobertura contractual; genera la matriz y detecta inconsistencias.             |
| [build-report.ts](../scripts/build-report.ts)                                                                           | Normaliza evidencias Playwright y registra fuentes ausentes; produce informe unificado JSON/Markdown.                |
| [build-exit-report.ts](../scripts/build-exit-report.ts)                                                                 | Añade cobertura de requisitos y defectos para resumir el cierre del ciclo.                                           |
| [build-dashboard.ts](../scripts/build-dashboard.ts)                                                                     | Valida y reúne informes, calidad e historial para el dashboard estático.                                             |
| [run-lighthouse.ts](../scripts/run-lighthouse.ts) y [build-lighthouse-report.ts](../scripts/build-lighthouse-report.ts) | Recogen muestras y aplican presupuestos: mediana de rendimiento, mínimos de accesibilidad y buenas prácticas.        |
| [mutation-summary.mjs](../scripts/mutation-summary.mjs)                                                                 | Resume el resultado Stryker por archivo y total; excluye mutantes no válidos del denominador.                        |
| [social-preview.mjs](../scripts/social-preview.mjs)                                                                     | Genera la imagen de presentación de GitHub; no participa en los resultados de pruebas.                               |

## Del test al informe: no confundir verde con ausencia de defectos

```text
Playwright JSON
  -> reporting/playwright: observaciones normalizadas
  -> reporting/model: forma y estados del informe
  -> reporting/exit-report: requisitos, defectos y cobertura
  -> reporting/history: instantáneas de ejecuciones sin duplicados
  -> build-dashboard: evidencias validadas + calidad nocturna opcional
  -> dashboard: presentación humana
```

- **passed**: el comportamiento esperado pasó sin ser un defecto conocido.
- **detected**: se observó exactamente una firma de defecto ya registrado.
- **failed**: fallo inesperado, incluida una firma conocida que cambió.
- **flaky**: hubo inestabilidad entre intentos; no se maquilla como pase limpio.
- **skipped**: no se ejecutó; no demuestra que el producto funcione.

[markKnownDefect](../tests/support/known-defect.ts) compara primero la firma
completa y solo después activa el fallo esperado. Un `test.fail()` incondicional
podría esconder otro error. Los informes distinguen además fuentes ausentes,
problemas de infraestructura y evidencia nocturna anterior: no son ceros exitosos.
Los tipos TypeScript del cliente describen respuestas; **no validan JSON en
ejecución**. Esa comprobación corresponde al contrato y a los guards de informes.

## Criterios para mantenerlo sencillo y rápido

- Deja el resultado esperado en la prueba; reutiliza las acciones en Page Objects.
  No crees clases base o wrappers si no eliminan una repetición real.
- Prepara datos por API cuando el escenario no pretende probar su introducción
  manual. Mantén independientes identidades, carritos y cuentas.
- Espera señales observables. El retraso de checkout representa el debounce real
  del formulario, no una pausa arbitraria para hacer pasar pruebas.
- Reutiliza trabajo costoso dentro del alcance correcto: validadores Ajv por
  contrato y expresiones regulares por patrón de trazabilidad. No guardes en una
  caché global productos, tokens o respuestas que pueden cambiar.
- Mide antes de conservar una optimización: menos llamadas al navegador no
  garantizan menos tiempo si aumenta el trabajo de evaluación o serialización.
- La trazabilidad usa un `Set` para pertenencia de operaciones contractuales;
  evita búsquedas lineales repetidas y conserva el orden de los problemas.
- Para un método nuevo, escribe JSDoc breve: qué hace, cómo espera/transforma y
  qué devuelve o qué error relevante propaga. No repitas el código línea a línea.
- Antes de subir: tipado, lint, formato y pruebas afectadas. Para cambios
  transversales como estos, ejecuta también `npm run test:hermetic`.

El [plan](test-management/test-plan.md) explica el alcance; la
[estrategia](test-management/test-strategy.md), los criterios; la
[trazabilidad](test-management/traceability-matrix.md), la cobertura diseñada; y el
[registro de defectos](test-management/defect-log.md), las limitaciones conocidas.
Ninguno de ellos reemplaza la evidencia de una ejecución concreta.

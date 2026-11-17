# Estado

> Cómo está el producto hoy. **60 líneas como máximo.** No es un registro: se edita sólo cuando cambia el estado (algo nuevo funcionando,
> un verde que dejó de serlo). Qué existe en el código lo dice `docs/MAPA.md`; lo que falta, `docs/PENDIENTES.md`; cómo se trabaja,
> `docs/FLUJO.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-17
**Estado:** **terminado (fases 0 a 9) y listo para desplegar.** Desplegar es de la persona (`docs/DESPLIEGUE.md`). Desde aquí el proyecto
recibe actualizaciones sueltas: una rama, un PR que se integra solo con el CI en verde.

## Funcionando

- **Equipo y permisos:** registro e invitaciones, roles libres sobre un catálogo fijo de permisos, por origen y con alcance, dominancia
  sobre la persona, bajas con traspaso de cartera, «Ver como».
- **Empresa y orígenes:** ajustes, monedas y tipos de cambio, integraciones (apibara, web pública), campos por origen con rango.
- **Vehículos:** inventario por origen con rutas e índices por caso, ficha en dos columnas con todo a la vista (fase y qué falta, relacionados, cotizaciones, documentos, ficha, repuestos y fotos) y un resumen corto, vitrina, papelera, subastas por apibara con su zona horaria; una sola situación real (fase y subasta) con su filtro, tarjetas o tabla, alta suelta o desde cotizar, vitrina desde la lista; «relacionados» (vinculado, interesado y cotizado) arriba de cada detalle.
- **Leads:** listado y kanban con cartera, teléfono único y enmascarado con teléfonos extra configurables, último seguimiento y recordatorio en la lista, campos configurables y privados, seguimientos, oportunidades (la base al nacer y una nueva desde la fila),
  la ficha en dos columnas con todo a la vista (índice de bloques, seguimientos y recordatorios resumidos con «Ver todos», relacionados con la
  gestión de vehículos al pie) y el resumen del listado como su versión corta, importar y exportar, limpieza automática, papelera.
- **Cotizaciones:** la fórmula como grafo versionado (motor en TS con su espejo SQL), el diseño de la hoja (rejilla de 12, orden arrastrando, espacios, letra y tono), niveles de acceso, la hoja de
  cotizar (vehículo y lead obligatorios por rol y origen, aviso con la subasta vencida), guardar con revisiones, la tarjeta y el PDF, la final, la aprobada (una por vehículo, con su primer resultado en la lista de vehículos), comprobantes, comentarios y papelera; el listado con buscador (número, cliente, vehículo y autor), vistas guardadas, columna de acciones y un resumen con pestañas (todo, adjuntos, revisiones y comentarios).
- **Flujos y logística:** fases, transiciones, requisitos y reglas por RPC, configurados sobre el diagrama del flujo (cajas y flechas, ordenar
  arrastrando, avisos de «Revisar» encima) con el panel de cada fase al costado; `/logistica` (la bandeja del día con siete grupos, la cadena como gráfica por fase, la lista de cada fase,
  «qué falta» con la acción que destraba cada requisito (hacerlo, ir a donde se hace o pedírselo a quien puede con una tarea), mover y el lote, documentos, embarques, aduana, gastos, pagos y margen), medida con 300.000 vehículos.
- **En todo el sistema:** avisos con acciones (cada bloqueo dice cómo destrabarlo), el visor de fotos con carrusel, «visto» y «último
  visto» por persona y módulo en las listas.
- **Repuestos:** proyectos guiados por pasos (las fases del flujo y sus hitos, con el siguiente de cada ítem), ítems, compras, stock, cotizador propio y pagos.
- **Agenda, chat, notificaciones y buscador:** la agenda como libreta del día con sus pendientes (semana y mes a un clic, eventos con su lead), canales y grupos con realtime, la campana y el push (sin claves
  VAPID todavía), la paleta `Ctrl/Cmd+K`.
- **Web y portal:** el contenido de la web pública por el esquema `web`, la cola con rueda y turnos, el portal del cliente por
  `api/portal/*`.
- **Actividad, datos y tablero:** `/actividad` con el diff recortado por cartera y su purga, `/datos` (exportar e importar todo con
  `importar-csv`), `/tablero` con widgets por persona, Inicio con sus bloques, la PWA.
- **Tareas de oro** (KLM, en `escritorio` y `movil`): registrar 18,3 s de 25; cotizar 59,2 s de 90; mover 1 en 13,9 s de 15 (desde la cadena: fase → vehículo → destino → nota) y el
  contenedor de 8 en 14,6 de 60; «Contacté» en 1 toque y el portal en 8 s de 30.

## Verdes

- `lint`, `typecheck`, `test` (10.300+ pruebas), `db:probar` (1.483 bloques), `db:lint`, `db:carreras` y `mapa.sh --check`.
- **Último e2e completo de escritorio** (el de la noche, en 4 bloques): en verde sobre `78b9b348`, 2026-11-15. El último con celular
  (Nivel 3, sobre `20815f1c`): 898 en verde, 31 saltadas, 0 caídas, 38,2 min.
- **CI:** Nivel 1 siempre, «Base» si cambia código, los e2e dirigidos (o el completo de escritorio en 4 bloques si toca un disparador),
  y `Listo · todo en verde`, el único check que `main` exige; el completo de escritorio, cada noche.
- **Base:** una sola migración (`20261113065630_base.sql`, las 249 anteriores aplastadas con la huella de la base idéntica).
- **Despliegue:** el ensayo en seco en `listo` (`pnpm despliegue:en-seco`).

## Al borde

- Presupuestos: la hoja, 492 nodos de 500; JS de `/cotizaciones/nuevo` 453,6 de 460 KB y de `/cotizaciones/[id]` 458,6 de 460; la ficha
  del lead entera 130,8 de 138 KB. Con la regla del 5 % se sube el tope (`docs/RENDIMIENTO.md`).
- El e2e completo con los dos proyectos tarda ≈ 95 min de reloj (5a-4b): en CI va en 4 bloques.

## Siguiente

- **Para la persona:** producción (variables, secretos, Vercel) y la lista de `docs/DESPLIEGUE.md` › «Lo que sólo una persona
  comprueba»; después, las decisiones de producto de `docs/PENDIENTES.md`.
- **Para una sesión:** lo que la persona pida, o lo de `docs/PENDIENTES.md` › «Seguridad y dinero» primero.

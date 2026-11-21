# leads/features/configuracion

Lo común de las tarjetas de Configuración › Leads (`/configuracion/leads`): la composición de las seis tarjetas y lo que comparten sus modales. Cada tarjeta
vive en su `features/` (`origenes`, `tipos`, `tipos-de-seguimiento`, `plantillas`).

## Entra y sale

- Sale por `pantallas/configuracion`: `ConfiguracionDeLeads` (`components/configuracion-de-leads.tsx`, sin `'use client'`: el `<TarjetasDeAjustes>` con las seis
  tarjetas; los datos los lee y pasa `src/app`).
- Lo usan las otras `features/` del módulo: `useFamiliaDelPanel()` (`hooks/`), `PieDeLaLista` y `accionDeNuevo()` (`components/`).

## No se rompe

- **Una familia de paneles, un modal abierto.** `entities/paneles-de-la-configuracion.ts` dice qué `?panel=` es de cada tarjeta (`FAMILIAS_DE_LA_CONFIGURACION`: la lista y
  los de sus ítems). `useFamiliaDelPanel(clave)` da `abierto`, `enLaFamilia`, `montar`, `abrir` y `cerrar`; el modal de la lista y el de un ítem son hermanos y, al cerrar el
  del ítem, la URL vuelve a `?panel=<lista>` en una sola escritura (`usePanelPorUrl({ volverA })`). El de la lista no devuelve el foco mientras sigue en la familia
  (`focoAlCerrar={() => !familia.enLaFamilia}`) y los de ítem tampoco (`() => false`).
- La tarjeta resume (`resumirLista()`, `ACTIVAS_EN_LA_TARJETA` = 5); el catálogo entero se lee con la página y se dibuja sólo dentro del modal, tras `diferido()`.
- Al llegar al tope, «Nuevo» queda apagado con su motivo (`PieDeLaLista`, `<prefijo>-tope`).

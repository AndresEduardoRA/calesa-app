# shared/ui/tarjetas-de-ajustes

El patrón de las páginas de ajustes de Configuración (docs/GLOSARIO.md › Tarjeta de ajustes; docs/DECISIONES.md › Interfaz): tarjetas resumen con lo guardado a la
vista y un modal para editar. Sólo dibuja: no lee la base ni guarda nada.

## Entra y sale

- Sale (`index.ts`):
  - `<TarjetasDeAjustes etiqueta>`: el tablero. Columnas CSS por contenedor (`@container/ajustes`: 1, 2 desde `@2xl`, 3 desde `@5xl`); sin `'use client'`.
  - `<TarjetaDeAjustes titulo estado? accion? acciones?>`: una región con nombre (el `h2`); la cabecera lleva el título y su `<Badge>` a la izquierda y la
    acción principal y el «⋯» a la derecha. Las acciones llegan como **nodos** (`<BotonDeLaTarjeta>`, `<MasAcciones>`): la tarjeta es sólo texto y viaja en frío.
  - `<ValoresDeLaTarjeta filas>`: el `dl` con «etiqueta, valor»; `valor: null` dice «Sin dato».
  - `<MuestraDeColor color>`: un color como cuadrito y su hex en texto.
  - `<TarjetaEditable titulo panel motivo abrir estado? extra?>`: `'use client'`; la tarjeta de lo que se edita en un modal: «Editar» a la vista y como primera
    línea del «⋯» (apagada, dice el `motivo`), con `extra` después. La usan Empresa, Sitio web y Legales.
  - `<BotonDeLaTarjeta panel etiqueta deshabilitado?>`: `'use client'`; abre `?panel=<panel>` con `usePanelPorUrl()`.
- Aparte, en `src/shared/ui/`: `use-envio-con-version.ts` (`useEnvioConVersion()`, el guardado de un modal con versión) y
  `esqueletos/esqueleto-tarjetas.tsx` (`<EsqueletoTarjetas tarjetas>`, la misma grilla para `loading.tsx`).
- Lo usan las páginas de Empresa, Integraciones, Comprobantes y Sitio web (Ajustes y Legales); Monedas (con la tarjeta de cada tipo de cambio); después, el perfil. No lo importan `layout.tsx` ni `_shell`.

## No se rompe

- Una tarjeta no se parte entre columnas (`break-inside-avoid`) y se separa con `mb-4`, no con `gap`. El orden del DOM es el de lectura y el de Tab: lo importante va primero.
- Un modal por tarjeta, con `ModalDeFormulario`; el `?panel=` lleva el nombre de la tarjeta y se revisa con `useRevisionAlAbrir()` si puede no abrirse. Nada de `<Bloque>` adentro.
- La versión de la fila entra al modal por props al abrir y **nunca** va en su `key` (guardar lo remontaría y perdería lo tipeado): la `key` es por apertura (`useApertura()`).
- Sin permiso, la acción principal se ve apagada y el motivo va en un `<Aviso>` de la página, no escondido.
- Con el texto al 200 %: el `dl` pasa a una columna en una tarjeta angosta, los botones parten el texto y un interruptor queda a ≥ 16 px del borde de su tarjeta.

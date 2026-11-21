// El alto de la unidad de logística en escritorio, para que la página no se desplace: la pantalla menos la barra superior (`--topbar`) y 8 rem que no son de la unidad: el relleno de `<main>` (5 rem: 1,5 arriba y
// 3,5 abajo, sitio para los botones flotantes), la sub-navegación de Logística (2 rem) y el `gap-4` del layout (1 rem). Lo define `src/app`, no el módulo: es el marco el que sabe cuánto ocupa. `PaginaDeLaUnidad` lo usa (`h-(--alto-del-detalle)`)
// sólo desde 56 rem de contenedor; por debajo el alto es natural. Una clase literal, para que Tailwind la vea.
export const CLASE_DEL_ALTO_DEL_DETALLE = '[--alto-del-detalle:calc(100dvh-var(--topbar)-8rem)]'

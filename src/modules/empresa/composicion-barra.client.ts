// Composición del popover de tipos de cambio de la barra superior, en el navegador. Aparte de `composicion.client.ts` a propósito: lo
// que lleva trae supabase-js, y sólo lo pide el contenido diferido del popover (`features/tipos-cambio/components/popover-de-la-barra/`)
// al abrirse; el marco de toda pantalla no lo paga.
export { leerTiposCambioVigentes } from './infra/tipos-cambio-vigentes.client'

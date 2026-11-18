// «Compartir la cotización» en la URL: `?panel=compartir` en el detalle y `?panel=compartir&para=<id>` en la lista (y donde se abra una cotización que no es la de la
// página). La pestaña va en `?compartir=texto` («Imagen» es la de por defecto y no escribe nada), no en `?pestana=`, que es del resumen del listado. Sin imports: lo leen
// los diálogos y quien los abre.
export const PANEL_DE_COMPARTIR = 'compartir'
export const CLAVE_DE_LA_PESTANA_DE_COMPARTIR = 'compartir'
export const PESTANAS_DE_COMPARTIR = ['imagen', 'texto'] as const
export type PestanaDeCompartir = (typeof PESTANAS_DE_COMPARTIR)[number]

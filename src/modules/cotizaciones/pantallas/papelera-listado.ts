// Lo que el área `papelera` llena en el listado de cotizaciones (4.15-6b): el enlace a la papelera junto a «Nueva cotización», desde el 4.24. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta lo que `/cotizaciones` pide y nada más.
export { HUECOS_DE_PAPELERA_EN_EL_LISTADO } from '../features/papelera/components/huecos-en-el-listado'
// «Enviar a la papelera» en el «⋯» de cada fila: el mismo envío de la guardada (sin preguntar, con «Deshacer» 10 s); la action revalida `/cotizaciones` y la lista se vuelve a dibujar.
export { enviarLaGuardadaALaPapelera as enviarLaCotizacionALaPapelera } from '../features/papelera/hooks/envio-a-papelera'

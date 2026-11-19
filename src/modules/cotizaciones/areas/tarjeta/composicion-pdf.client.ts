// Composición del área `tarjeta` en el navegador para el PDF de una guardada: pedirlo al elegir «Descargar PDF» (el pie de «Vista previa» y el «⋯» de la cabecera). Aparte de
// `composicion.client.ts` (la lectura de «Vista previa»): la línea del «⋯» viaja en frío con la hoja y no debe arrastrar esa lectura (`docs/LECCIONES.md` › «Módulos y JS en
// frío»).
export { pedirElPdf } from '../../infra/tarjeta/descarga-del-pdf.client'

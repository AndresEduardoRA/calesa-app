// Composición del área `tarjeta` en el navegador para «Compartir la cotización»: los datos del texto, la portada, las fotos. Aparte de `composicion.client.ts` y de
// `composicion-portada.client.ts`: la importa sólo el panel (diferido), y ninguna pantalla en frío paga estas lecturas (`docs/LECCIONES.md` › «Módulos y JS en frío»).
export {
  MENSAJE_SIN_ACCESO,
  pedirLaFoto,
  pedirLaPortadaParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from '../../infra/tarjeta/compartir.client'

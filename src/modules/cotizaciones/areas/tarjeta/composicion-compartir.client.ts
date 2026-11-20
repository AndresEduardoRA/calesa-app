// Composición del área `tarjeta` en el navegador para «Compartir la cotización»: los datos del texto, la imagen de la tarjeta, las fotos. Aparte de
// `composicion.client.ts`: la importa sólo el panel (diferido), y ninguna pantalla en frío paga estas lecturas (`docs/LECCIONES.md` › «Módulos y JS en frío»).
export {
  apilarImagenes,
  MENSAJE_SIN_ACCESO,
  pedirLaFoto,
  pedirLaImagenParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from '../../infra/tarjeta/compartir.client'

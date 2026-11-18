// Composición del área `tarjeta` en el navegador para la portada: pedirla tras guardar. Aparte de `composicion.client.ts` (la lectura de «Vista previa» y su PDF): la
// importa `<ProveedorDeLaTarjeta>`, que viaja con la hoja en frío, y no debe arrastrar esas lecturas (`docs/LECCIONES.md` › «Módulos y JS en frío»).
export { pedirLaPortada } from '../../infra/tarjeta/portada.client'

// Una cuadrícula chica para las pruebas de los retoques (el sufijo `.soporte.` la deja fuera del mapa): tres filas, una celda que abarca dos y celdas de texto,
// de dato, de logo y vacías. «constructor» es una fila y una celda: un id legal que un objeto encontraría en su prototipo.
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'

export const CUADRICULA_DE_RETOQUES: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [
    { id: 'a', ancho: 120 },
    { id: 'b', ancho: 200 },
  ],
  filas: [
    { id: 'f_titulo', alto: 40, ocultar_si: 'nunca' },
    { id: 'f_flete', alto: 24, ocultar_si: 'no_aplica', nodo: 'flete' },
    { id: 'constructor', alto: 30, ocultar_si: 'nunca' },
  ],
  celdas: [
    { id: 'c_saludo', fila: 'f_titulo', columna: 'a', contenido: { tipo: 'texto', texto: 'Hola' } },
    { id: 'c_logo', fila: 'f_titulo', columna: 'b', contenido: { tipo: 'logo' } },
    {
      id: 'c_grupo',
      fila: 'f_flete',
      columna: 'a',
      abarca_filas: 2,
      contenido: { tipo: 'texto', texto: 'Logística' },
    },
    {
      id: 'c_monto',
      fila: 'f_flete',
      columna: 'b',
      contenido: { tipo: 'dato', nodo: 'flete', mostrar: 'monto' },
    },
    {
      id: 'constructor',
      fila: 'constructor',
      columna: 'b',
      contenido: { tipo: 'texto', texto: 'Gracias' },
    },
  ],
}

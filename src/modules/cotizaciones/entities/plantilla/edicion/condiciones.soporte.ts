// Un contexto de prueba para las condiciones del editor de la tarjeta: un nodo con monto (`remate`), la variante (`motor`) y un interruptor (`seguro`), los tres del
// nivel «todos». Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import type { ContextoDePlantilla } from '../validar-plantilla'

export const CONTEXTO_DE_CONDICIONES: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra' },
      {
        id: 'motor',
        etiqueta: 'Motor',
        tipo: 'opcion',
        opciones: [
          { clave: 'gasolina', titulo: 'A gasolina' },
          { clave: 'diesel', titulo: 'A diésel' },
        ],
      },
      { id: 'seguro', etiqueta: 'Seguro', tipo: 'bandera' },
    ],
    grupos: [{ id: 'compra', etiqueta: 'Compra' }],
  },
  diseno: null,
  visibilidad: { remate: { ver: 'todos' }, motor: { ver: 'todos' }, seguro: { ver: 'todos' } },
  tonos: [],
}

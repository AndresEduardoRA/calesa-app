// Una copia reducida de la fórmula de subasta_usa y su plantilla sembrada, para el juego espejo de la conversión (`casos-de-conversion.soporte.ts`).
import type { Plantilla } from './forma-de-plantilla'
import type { JuegoDePlantilla } from './juego-de-plantilla.soporte'

const TODOS = { ver: 'todos' }

// Una copia reducida de la fórmula de subasta_usa: la variante, sus tres grupos con sus miembros y sus colores, los dos modos y la garantía aparte.
export const SUBASTA: JuegoDePlantilla['formulas'][string] = {
  definicion: {
    nodos: [
      {
        id: 'variante',
        tipo: 'opcion',
        etiqueta: 'Variante',
        opciones: [
          { clave: 'moto', etiqueta: 'Moto', titulo: 'COTIZACIÓN MOTO EEUU - BOLIVIA' },
          { clave: 'chile', etiqueta: 'USA → Chile', titulo: 'COTIZACIÓN VEHÍCULOS EEUU - CHILE' },
        ],
      },
      { id: 'tc_oficial', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC oficial' },
      { id: 'tc_paralelo', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'TC paralelo' },
      { id: 'tc_unificado', tipo: 'tipo_cambio', clave: 'unificado', etiqueta: 'Dólar unificado' },
      {
        id: 'remate',
        tipo: 'input',
        etiqueta: 'Remate (costo aprox.)',
        descripcion: 'Probabilidad de compra en subasta',
        grupo: 'compra',
      },
      {
        id: 'fees',
        tipo: 'input',
        etiqueta: 'Fees / Tarifa USA',
        descripcion: 'Comisión de subasta USA (aprox.)',
        grupo: 'compra',
      },
      {
        id: 'transferencia',
        tipo: 'input',
        etiqueta: 'Transferencia a USA',
        descripcion: 'Comisión giro 4%',
        grupo: 'compra',
      },
      {
        id: 'grua',
        tipo: 'input',
        etiqueta: 'Grúa',
        descripcion: 'Traslado al puerto (USA)',
        grupo: 'logistica',
      },
      {
        id: 'transporte_chile',
        tipo: 'input',
        etiqueta: 'Transporte',
        descripcion: 'USA - Chile',
        grupo: 'logistica',
      },
      {
        id: 'nacionalizacion',
        tipo: 'input',
        etiqueta: 'Nacionalización',
        descripcion: 'Póliza y gastos aduaneros',
        grupo: 'aduana',
      },
      { id: 'garantia', tipo: 'input', etiqueta: 'Garantía de participación', salida: 'aparte' },
      {
        id: 'total',
        tipo: 'calculo',
        etiqueta: 'TOTAL',
        salida: 'total',
        descripcion: 'Todo con papeles',
      },
    ],
    buckets: { exterior: 'tc_paralelo', aduana: 'tc_oficial' },
    grupos: [
      { id: 'compra', etiqueta: 'Compra', plazo: '2 días', tono: 'verde', bucket: 'exterior' },
      {
        id: 'logistica',
        etiqueta: 'Logística',
        plazo: '7 días',
        tono: 'amarillo',
        bucket: 'exterior',
      },
      {
        id: 'aduana',
        etiqueta: 'Aduana',
        plazo: '4 meses (Aprox.)',
        tono: 'naranja',
        bucket: 'aduana',
      },
    ],
  },
  diseno: {
    cabecera: {
      modos: [
        {
          buckets: [
            { bucket: 'exterior', nodo: 'tc_paralelo' },
            { bucket: 'aduana', nodo: 'tc_oficial' },
          ],
        },
        {
          buckets: [
            { bucket: 'exterior', nodo: 'tc_unificado' },
            { bucket: 'aduana', nodo: 'tc_oficial' },
          ],
        },
      ],
    },
    tarjeta_total: { secundarios: ['garantia'] },
  },
  visibilidad: Object.fromEntries(
    [
      'variante',
      'tc_oficial',
      'tc_paralelo',
      'tc_unificado',
      'remate',
      'fees',
      'transferencia',
      'grua',
      'transporte_chile',
      'nacionalizacion',
      'garantia',
      'total',
    ].map((id) => [id, TODOS]),
  ),
}

export const SUBASTA_PLANTILLA: Plantilla = {
  grupos: [
    { grupo: 'compra', tono: 'verde' },
    { grupo: 'logistica', tono: 'amarillo' },
    { grupo: 'aduana', tono: 'naranja' },
  ],
  etiquetas: { garantia: 'GARANTÍA PARA LA PARTICIPACIÓN' },
  total: {
    etiqueta: 'TOTAL DÓLARES',
    leyenda: 'Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación)',
  },
  nota: 'Nota: Esta es una cotización referencial; los montos pueden variar con el tipo de cambio.',
  logo: true,
  columnas: { leyenda: true, tipo_cambio: true, plazo: true },
}

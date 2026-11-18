// Una tarjeta de prueba para las pruebas de los componentes y del modelo: la lectura cruda de `cotizacion_tarjeta()` en cuadrícula, con el encabezado, tres
// grupos (uno con dos miembros y el tipo de cambio y el plazo combinados), el total en dos renglones, lo aparte y la nota. Sólo para las pruebas (el sufijo
// `.soporte.` lo deja fuera del mapa).

const FINO = { todos: 'fino' }
const dato = (nodo: string, mostrar: string) => ({ tipo: 'dato', nodo, mostrar })
// Una celda en `[id, fila, columna]` con su contenido y lo demás (combinaciones y estilo).
const celda = (
  [id, fila, columna]: readonly [string, string, string],
  contenido: unknown,
  extra: Record<string, unknown> = {},
) => ({ id, fila, columna, contenido, ...extra })

export const DEFINICION_DE_PRUEBA = {
  forma: 2,
  columnas: [
    { id: 'grupo', ancho: 100 },
    { id: 'concepto', ancho: 190 },
    { id: 'monto', ancho: 110 },
    { id: 'tipo_cambio', ancho: 90 },
  ],
  filas: [
    { id: 'fecha', alto: 25, ocultar_si: 'nunca' },
    { id: 'asesor', alto: 25, ocultar_si: 'nunca' },
    { id: 'n_remate', alto: 25, ocultar_si: 'no_aplica', nodo: 'remate' },
    { id: 'n_fees', alto: 25, ocultar_si: 'no_aplica_o_cero', nodo: 'fees' },
    { id: 'n_flete', alto: 25, ocultar_si: 'no_aplica', nodo: 'flete' },
    { id: 'total', alto: 54, ocultar_si: 'nunca' },
    { id: 'a_garantia', alto: 25, ocultar_si: 'no_aplica', nodo: 'garantia' },
    { id: 'nota', alto: 40, ocultar_si: 'nunca' },
  ],
  celdas: [
    celda(
      ['c_titulo', 'fecha', 'grupo'],
      { tipo: 'dato', variable: 'titulo_opcion' },
      { abarca_columnas: 2 },
    ),
    celda(
      ['c_fecha', 'fecha', 'monto'],
      { tipo: 'dato', variable: 'fecha_larga' },
      { abarca_columnas: 2 },
    ),
    celda(['c_asesor_rotulo', 'asesor', 'grupo'], { tipo: 'texto', texto: 'Asesor:' }),
    celda(['c_asesor', 'asesor', 'concepto'], { tipo: 'dato', variable: 'asesor_nombre' }),
    celda(['c_logo', 'asesor', 'monto'], { tipo: 'logo' }, { abarca_columnas: 2 }),
    celda(
      ['c_compra', 'n_remate', 'grupo'],
      { tipo: 'texto', texto: 'Compra' },
      {
        abarca_filas: 2,
        estilo: { fondo: 'verde', negrita: true, alinear_vertical: 'arriba', bordes: FINO },
      },
    ),
    celda(['c_remate', 'n_remate', 'concepto'], dato('remate', 'etiqueta'), {
      estilo: { fondo: 'verde', bordes: FINO },
    }),
    celda(['c_remate_monto', 'n_remate', 'monto'], dato('remate', 'monto'), {
      estilo: { fondo: 'verde', negrita: true, alinear: 'derecha', bordes: FINO },
    }),
    celda(['c_compra_tc', 'n_remate', 'tipo_cambio'], dato('remate', 'tc_nombre'), {
      abarca_filas: 2,
      estilo: { fondo: 'verde', alinear: 'centro' },
    }),
    celda(['c_fees', 'n_fees', 'concepto'], dato('fees', 'etiqueta'), {
      estilo: { fondo: 'verde' },
    }),
    celda(['c_fees_monto', 'n_fees', 'monto'], dato('fees', 'monto'), {
      estilo: { fondo: 'verde', alinear: 'derecha' },
    }),
    celda(
      ['c_logistica', 'n_flete', 'grupo'],
      { tipo: 'texto', texto: 'Logística' },
      { estilo: { fondo: 'amarillo', bordes: { todos: 'fino', abajo: 'grueso' } } },
    ),
    celda(['c_flete', 'n_flete', 'concepto'], dato('flete', 'descripcion'), {
      estilo: { fondo: 'ya_no_esta' },
    }),
    celda(['c_flete_monto', 'n_flete', 'monto'], dato('flete', 'monto')),
    celda(['c_flete_pct', 'n_flete', 'tipo_cambio'], dato('flete', 'porcentaje')),
    celda(
      ['c_total', 'total', 'grupo'],
      { tipo: 'texto', texto: 'TOTAL DÓLARES' },
      { abarca_columnas: 2, estilo: { tamano: 16, negrita: true } },
    ),
    celda(['c_total_monto', 'total', 'monto'], dato('total', 'monto'), {
      abarca_columnas: 2,
      estilo: { tamano: 16, negrita: true, alinear: 'derecha' },
    }),
    celda(['c_garantia', 'a_garantia', 'grupo'], dato('garantia', 'etiqueta'), {
      abarca_columnas: 2,
    }),
    celda(['c_garantia_monto', 'a_garantia', 'monto'], dato('garantia', 'monto')),
    celda(
      ['c_nota', 'nota', 'grupo'],
      { tipo: 'texto', texto: 'Precios sujetos a cambio.\nNo incluye reparación.' },
      { abarca_columnas: 4, estilo: { tamano: 11, cursiva: true } },
    ),
  ],
}

export const crudaDeLaTarjeta = (mas: Record<string, unknown> = {}) => ({
  estado: 'lista',
  plantilla: { version: 1 },
  definicion: DEFINICION_DE_PRUEBA,
  nodos: [
    { id: 'fees', etiqueta: 'Fees', descripcion: null, grupo: 'compra', pct: null },
    {
      id: 'flete',
      etiqueta: 'Flete',
      descripcion: 'Flete marítimo',
      grupo: 'logistica',
      pct: 'flete_pct',
    },
    {
      id: 'garantia',
      etiqueta: 'GARANTÍA PARA LA PARTICIPACIÓN',
      descripcion: null,
      grupo: null,
      pct: null,
    },
    {
      id: 'remate',
      etiqueta: 'Remate',
      descripcion: 'Precio de subasta',
      grupo: 'compra',
      pct: null,
    },
    { id: 'total', etiqueta: 'TOTAL', descripcion: null, grupo: null, pct: null },
  ],
  grupos: [{ id: 'compra', etiqueta: 'Compra', plazo: '48 horas', bucket: 'compra' }],
  tipos_de_cambio: {
    buckets: { compra: { nombre: 'Dólar oficial', nodo: 'tc_oficial' } },
    modos: { bcb: { compra: { nombre: 'Dólar BCB', nodo: 'tc_bcb' } } },
  },
  modos: [],
  variante: {
    nodo: 'variante',
    opciones: [{ clave: 'gasolina', titulo: 'COTIZACIÓN A GASOLINA' }],
  },
  colores: [
    { clave: 'amarillo', hex: '#fff7d6' },
    { clave: 'verde', hex: '#31869b' },
  ],
  total: { nodo: 'total' },
  moneda_bs: 'BOB',
  ...mas,
})

export const CONTEXTO_DE_PRUEBA = {
  fecha: '6 nov 2026',
  numero: '12',
  titulo: null,
  asesor: 'Ana Pérez',
  cliente: null,
  vehiculo: { titulo: 'Toyota Hilux 2022', lote: null, vin: null },
  venceEl: null,
  logo: { nombre: 'Calesa', url: 'https://ejemplo.com/logo.png' },
}

export { calculoDePrueba } from '../calculo-de-la-tarjeta.soporte'

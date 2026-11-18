// El juego espejo de la conversión de la forma 1 a la cuadrícula (`casos-de-conversion.json`): lo que `convertirPlantilla()` da para cada caso, para que
// `_plantilla_convertir()` de la base (`supabase/tests/areas/tarjeta/plantilla-convertir.sql`) dé exactamente lo mismo. Lo genera y lo compara
// `casos-de-conversion.test.ts` (`ACTUALIZAR_CASOS=1` lo reescribe). Sin I/O: las fórmulas `mini` y `oficina` le llegan del juego de la plantilla.
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { JuegoDePlantilla } from './juego-de-plantilla.soporte'
import type { ContextoDeNodos } from './nodos-de-plantilla'
import { SUBASTA, SUBASTA_PLANTILLA } from './formula-de-subasta.soporte'

type FormulaDelJuego = JuegoDePlantilla['formulas'][string]

export type CasoDeConversion = {
  nombre: string
  formula: string
  plantilla: Plantilla
  tonos: string[]
  visibilidad?: Record<string, unknown>
  esperada: PlantillaEnCuadricula
}

const TODOS = { ver: 'todos' }
const LARGO = 'a'.repeat(41)

// La «mini» con un grupo sin miembros y un miembro de id de 41 caracteres (el hash de su fila).
function miniConExtras(mini: FormulaDelJuego): FormulaDelJuego {
  const nodos = mini.definicion.nodos
  return {
    ...mini,
    definicion: {
      ...mini.definicion,
      nodos: [
        { id: LARGO, tipo: 'input', etiqueta: 'Un nodo de id largo', grupo: 'compra' },
        ...nodos,
      ],
      grupos: [
        ...(mini.definicion.grupos ?? []),
        { id: 'seguro', etiqueta: 'Seguro', bucket: 'exterior' },
      ],
    },
    visibilidad: { ...mini.visibilidad, [LARGO]: TODOS },
  }
}

const columnas = (leyenda: boolean, tipo_cambio: boolean, plazo: boolean) => ({
  leyenda,
  tipo_cambio,
  plazo,
})
const MINI_GRUPOS = [{ grupo: 'compra' }, { grupo: 'logistica' }, { grupo: 'aduana' }]

type SinEsperada = Omit<CasoDeConversion, 'esperada' | 'tonos'> & { tonos?: string[] }

const mini = (
  nombre: string,
  p: Partial<Plantilla>,
  extra: Partial<SinEsperada> = {},
): SinEsperada => ({
  nombre,
  formula: 'mini',
  plantilla: {
    grupos: MINI_GRUPOS,
    total: { etiqueta: 'Total' },
    logo: true,
    columnas: columnas(true, true, true),
    ...p,
  },
  ...extra,
})

const deLaSubasta = (): SinEsperada[] => [
  {
    nombre:
      'subasta: la plantilla sembrada (título de la opción, tres grupos con color, total con leyenda, lo aparte, nota y logo)',
    formula: 'subasta',
    plantilla: SUBASTA_PLANTILLA,
  },
  {
    nombre: 'subasta: la variante restringida no lleva la fila del título',
    formula: 'subasta',
    plantilla: SUBASTA_PLANTILLA,
    visibilidad: { ...SUBASTA.visibilidad, variante: { ver: 'costos' } },
  },
  {
    nombre: 'subasta: sin logo, los textos del encabezado van a todo el ancho',
    formula: 'subasta',
    plantilla: { ...SUBASTA_PLANTILLA, logo: false },
  },
]

const deLaMini = (): SinEsperada[] => [
  mini('mini: las seis columnas', {}),
  mini('mini: sin la leyenda (la del total va en su fila)', {
    columnas: columnas(false, true, true),
    total: { etiqueta: 'Total', leyenda: 'Todo con papeles' },
  }),
  mini('mini: sin el tipo de cambio', { columnas: columnas(true, false, true) }),
  mini('mini: sin el plazo', { columnas: columnas(true, true, false) }),
  mini('mini: sólo concepto y monto con grupo (tres columnas: el logo al costado)', {
    columnas: columnas(false, false, false),
  }),
  mini('mini: la etiqueta y la leyenda escritas, y una leyenda vacía', {
    etiquetas: { remate: 'Remate en subasta' },
    leyendas: { remate: 'Lo que se paga en la subasta', grua: '' },
  }),
  mini(
    'mini: el color elegido y el del grupo; uno que ya no está cae al del grupo',
    {
      grupos: [
        { grupo: 'compra', tono: 'azul' },
        { grupo: 'logistica', tono: 'gris' },
        { grupo: 'aduana' },
      ],
    },
    { tonos: ['verde', 'amarillo', 'azul'] },
  ),
  mini('mini: la nota con un salto de línea y la etiqueta de lo aparte', {
    nota: 'Nota: referencial.\nLos montos pueden variar.',
    etiquetas: { garantia: 'GARANTÍA' },
  }),
  mini('mini: la leyenda del total en blanco no tiene fila', {
    columnas: columnas(false, false, false),
    total: { etiqueta: 'Total', leyenda: '  ' },
  }),
]

const deLasOtras = (): SinEsperada[] => [
  {
    nombre: 'con extras: un grupo sin miembros no se dibuja y un nodo de 41 caracteres va con hash',
    formula: 'mini_con_extras',
    plantilla: {
      grupos: [...MINI_GRUPOS, { grupo: 'seguro' }],
      total: { etiqueta: 'Total' },
      logo: false,
      columnas: columnas(true, true, true),
    },
  },
  {
    nombre: 'oficina: sin grupos ni leyenda (dos columnas: el logo arriba)',
    formula: 'oficina',
    plantilla: {
      grupos: [],
      total: { etiqueta: 'TOTAL' },
      logo: true,
      columnas: columnas(false, true, true),
    },
  },
  {
    nombre: 'oficina: sin grupos, con la leyenda y sin logo',
    formula: 'oficina',
    plantilla: {
      grupos: [],
      total: { etiqueta: 'TOTAL', leyenda: 'Precio final' },
      logo: false,
      columnas: columnas(true, false, false),
    },
  },
]

const casos = (): SinEsperada[] => [...deLaSubasta(), ...deLaMini(), ...deLasOtras()]

export function formulasDeLaConversion(juego: JuegoDePlantilla): Record<string, FormulaDelJuego> {
  const { mini, oficina } = juego.formulas
  if (mini === undefined || oficina === undefined)
    throw new Error('el juego de la plantilla no trae mini u oficina')
  return { mini, mini_con_extras: miniConExtras(mini), oficina, subasta: SUBASTA }
}

export function generarCasosDeConversion(juego: JuegoDePlantilla) {
  const formulas = formulasDeLaConversion(juego)
  return {
    _nota:
      'El juego espejo de la conversión de la forma 1 a la cuadrícula: lo genera convertirPlantilla() (entities/plantilla/casos-de-conversion.test.ts, ACTUALIZAR_CASOS=1) y lo corre _plantilla_convertir() en supabase/tests/areas/tarjeta/plantilla-convertir.sql. Cada caso convierte su plantilla con la fórmula nombrada (su visibilidad, o la del caso) y sus tonos del catálogo; `esperada` es la cuadrícula que sale.',
    formulas,
    casos: casos().map((c): CasoDeConversion => {
      const fo = formulas[c.formula]
      if (fo === undefined) throw new Error(`«${c.nombre}»: no hay fórmula ${c.formula}`)
      const tonos = c.tonos ?? juego.tonos
      const contexto: ContextoDeNodos = {
        definicion: fo.definicion,
        diseno: fo.diseno,
        visibilidad: c.visibilidad ?? fo.visibilidad,
      }
      return { ...c, tonos, esperada: convertirPlantilla(c.plantilla, contexto, tonos) }
    }),
  }
}

export const casosDeConversionComoTexto = (juego: JuegoDePlantilla): string =>
  `${JSON.stringify(generarCasosDeConversion(juego), null, 2)}\n`

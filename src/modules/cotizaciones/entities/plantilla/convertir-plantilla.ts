// La plantilla de hoy (forma 1) convertida a la cuadrícula (forma 2) con la misma apariencia: espejo de `_plantilla_convertir()` de la base, que la convierte
// al leerla (las plantillas guardadas no se migran). Pura y determinista: los ids salen del grupo, el nodo y la columna (`ids-de-la-conversion.ts`) y los
// altos, de los textos (`altos-de-la-conversion.ts`). Entra una forma 1 ya validada contra la versión; sale una forma 2 que no se mide contra los 24 KiB (D12).
// Juego espejo: `casos-de-conversion.json`. Todo lo que se busca por id va por `Map`/`Object.hasOwn`.
import { FORMA_DE_LA_CUADRICULA, type PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  Armado,
  columnasDe,
  conTexto,
  dato,
  escrito,
  FINO,
  miembrosDe,
  texto,
  variable,
  type Conversion,
  type Pieza,
} from './armado-de-la-conversion'
import type { Plantilla } from './forma-de-plantilla'
import { grupo } from './grupos-de-la-conversion'
import { idDeLaFila } from './ids-de-la-conversion'
import { btrim } from './json-de-la-base'
import { esDeTodos, type ContextoDeNodos } from './nodos-de-plantilla'

// La fila del logo arriba (con 2 columnas), el título de la opción (si la variante es del nivel «todos»), la fecha con el título de la cotización, el número y
// el asesor; con 3 columnas o más, el logo va al costado y abarca esas filas.
function encabezado(c: Conversion): void {
  const { a, primera, segunda, ultima, finDelEncabezado: fin } = c
  if (c.plantilla.logo && !c.logoAlCostado)
    a.fila('logo', [{ columna: primera, hasta: ultima, contenido: { tipo: 'logo' }, renglones: 2 }])
  const opcion = c.nodos.find((n) => n.tipo === 'opcion')
  const conTitulo = opcion !== undefined && esDeTodos(c.contexto.visibilidad ?? {}, opcion.id)
  const titulo: [string, Pieza[]] = [
    'titulo',
    [
      {
        columna: primera,
        hasta: fin,
        contenido: variable('titulo_opcion'),
        estilo: { tamano: 18, negrita: true },
      },
    ],
  ]
  const filas: [string, Pieza[]][] = [
    ...(conTitulo ? [titulo] : []),
    // El título de la cotización al lado de la fecha (como iba en el PDF): cabe siempre, porque el encabezado tiene al menos 2 columnas.
    [
      'fecha',
      [
        { columna: primera, contenido: variable('fecha_larga') },
        { columna: segunda, hasta: fin, contenido: variable('titulo') },
      ],
    ],
    [
      'numero',
      [
        { columna: primera, contenido: texto('Cotización n.º'), medida: 'Cotización n.º' },
        { columna: segunda, hasta: fin, contenido: variable('numero') },
      ],
    ],
    [
      'asesor',
      [
        { columna: primera, contenido: texto('Asesor:'), medida: 'Asesor:' },
        { columna: segunda, hasta: fin, contenido: variable('asesor_nombre') },
      ],
    ],
  ]
  for (const [i, [id, piezas]] of filas.entries()) {
    const logo: Pieza[] =
      c.logoAlCostado && i === 0
        ? [{ columna: ultima, filas: filas.length, contenido: { tipo: 'logo' } }]
        : []
    a.fila(id, [...piezas, ...logo])
  }
  a.fila('vehiculo', [
    {
      columna: primera,
      hasta: ultima,
      contenido: variable('vehiculo_titulo'),
      estilo: { tamano: 14, negrita: true },
    },
  ])
}

// Los rótulos «Tipo de cambio» y «Plazo», una vez, sobre sus columnas; lo de antes, vacío.
function cabecera({ a, primera }: Conversion): void {
  const laterales = (['tipo_cambio', 'plazo'] as const).filter((x) => a.tiene(x))
  const [primerLateral] = laterales
  if (primerLateral === undefined) return
  const estilo = { tamano: 11, negrita: true, alinear: 'centro', bordes: FINO } as const
  a.fila('cabecera', [
    { columna: primera, hasta: a.anterior(primerLateral), contenido: { tipo: 'vacio' } },
    ...laterales.map((x): Pieza => {
      const rotulo = x === 'tipo_cambio' ? 'Tipo de cambio' : 'Plazo'
      return { columna: x, contenido: texto(rotulo), estilo, medida: rotulo }
    }),
  ])
}

// El total (en dos renglones: la moneda local va debajo, D6) con su leyenda en su columna o, sin ella, en una fila aparte.
function total(c: Conversion): void {
  const { a, plantilla } = c
  const nodo = c.nodos.find((n) => n.salida === 'total')
  const desde = a.tiene('grupo') ? 'grupo' : 'concepto'
  const etiqueta = plantilla.total.etiqueta
  const leyenda = plantilla.total.leyenda ?? ''
  const conLeyenda = btrim(leyenda) !== ''
  const deLaLeyenda = { tamano: 11, bordes: FINO } as const
  const enSuColumna: Pieza[] = !a.tiene('leyenda')
    ? []
    : conLeyenda
      ? [{ columna: 'leyenda', contenido: texto(leyenda), estilo: deLaLeyenda, medida: leyenda }]
      : [{ columna: 'leyenda', contenido: { tipo: 'vacio' }, estilo: deLaLeyenda }]
  a.fila('total', [
    {
      columna: desde,
      hasta: 'concepto',
      contenido: texto(etiqueta),
      estilo: { tamano: 16, negrita: true, bordes: FINO },
      medida: etiqueta,
    },
    {
      columna: 'monto',
      contenido: nodo === undefined ? { tipo: 'vacio' } : dato(nodo.id, 'monto'),
      estilo: { tamano: 14, negrita: true, alinear: 'derecha', bordes: FINO },
      renglones: 2,
    },
    ...enSuColumna,
  ])
  if (!a.tiene('leyenda') && conLeyenda)
    a.fila('total_leyenda', [
      {
        columna: c.primera,
        hasta: c.ultima,
        contenido: texto(leyenda),
        estilo: { tamano: 11 },
        medida: leyenda,
      },
    ])
}

// Lo aparte de la tarjeta del total (se oculta si no aplica: la garantía con su interruptor apagado) y la nota.
function aparteYNota(c: Conversion): void {
  const { a, plantilla } = c
  const desde = a.tiene('grupo') ? 'grupo' : 'concepto'
  for (const s of c.contexto.diseno?.tarjeta_total?.secundarios ?? []) {
    const etiqueta = escrito(plantilla.etiquetas, s)
    const delNodo = c.nodos.find((n) => n.id === s)?.etiqueta ?? ''
    const rotulo: Pieza = conTexto(etiqueta)
      ? {
          columna: desde,
          hasta: 'concepto',
          contenido: texto(etiqueta),
          estilo: { bordes: FINO },
          medida: etiqueta,
        }
      : {
          columna: desde,
          hasta: 'concepto',
          contenido: dato(s, 'etiqueta'),
          estilo: { bordes: FINO },
          medida: delNodo,
        }
    a.fila(
      idDeLaFila('a', s),
      [
        rotulo,
        {
          columna: 'monto',
          contenido: dato(s, 'monto'),
          estilo: { alinear: 'derecha', bordes: FINO },
        },
      ],
      s,
    )
  }
  const nota = plantilla.nota ?? ''
  if (btrim(nota) !== '')
    a.fila('nota', [
      {
        columna: c.primera,
        hasta: c.ultima,
        contenido: texto(nota),
        estilo: { tamano: 11, cursiva: true },
        medida: nota,
      },
    ])
}

function conversion(
  plantilla: Plantilla,
  contexto: ContextoDeNodos,
  tonos: readonly string[],
): Conversion {
  const nodos = contexto.definicion.nodos ?? []
  const conGrupo = plantilla.grupos.some((g) => miembrosDe(nodos, g.grupo).length > 0)
  const a = new Armado(columnasDe(plantilla, conGrupo))
  const ids = a.columnas.map((x) => x.id)
  const n = ids.length
  const logoAlCostado = plantilla.logo && n >= 3
  const ultima = ids[n - 1] ?? 'monto'
  return {
    a,
    plantilla,
    contexto,
    nodos,
    catalogo: new Set(tonos),
    primera: ids[0] ?? 'concepto',
    segunda: ids[1] ?? 'monto',
    ultima,
    finDelEncabezado: (logoAlCostado ? ids[n - 2] : ultima) ?? 'monto',
    logoAlCostado,
  }
}

export function convertirPlantilla(
  plantilla: Plantilla,
  contexto: ContextoDeNodos,
  tonos: readonly string[],
): PlantillaEnCuadricula {
  const c = conversion(plantilla, contexto, tonos)
  encabezado(c)
  cabecera(c)
  for (const g of plantilla.grupos) {
    if (miembrosDe(c.nodos, g.grupo).length > 0) grupo(c, g)
  }
  total(c)
  aparteYNota(c)
  return {
    forma: FORMA_DE_LA_CUADRICULA,
    columnas: c.a.columnas,
    filas: c.a.filas,
    celdas: c.a.celdas,
  }
}

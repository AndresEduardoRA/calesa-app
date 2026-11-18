// Los grupos de la conversión de la forma 1 a la cuadrícula (`convertir-plantilla.ts`): una fila por miembro, con el color del grupo, y el título, el tipo de
// cambio y el plazo una vez, abarcando las filas del grupo. Espejo de la parte de `_plantilla_convertir()` que recorre los grupos.
import {
  conFondo,
  conTexto,
  dato,
  escrito,
  FINO,
  miembrosDe,
  texto,
  type Conversion,
  type Pieza,
} from './armado-de-la-conversion'
import type { GrupoDePlantilla } from './forma-de-plantilla'
import { idDeLaFila } from './ids-de-la-conversion'
import type { NodoParaPlantilla } from './nodos-de-plantilla'

// El color del grupo (D10): el que elige la plantilla si sigue en el catálogo; si no, el del grupo en la fórmula; si no, ninguno (`auto`).
function fondoDe(c: Conversion, g: GrupoDePlantilla): string | null {
  const delGrupo = (c.contexto.definicion.grupos ?? []).find((x) => x.id === g.grupo)?.tono
  if (g.tono !== undefined && c.catalogo.has(g.tono)) return g.tono
  return delGrupo != null && c.catalogo.has(delGrupo) ? delGrupo : null
}

function leyendaDe(c: Conversion, m: NodoParaPlantilla, fondo: string | null): Pieza {
  const leyenda = escrito(c.plantilla.leyendas, m.id)
  const estilo = conFondo(fondo, { tamano: 11, bordes: FINO })
  if (leyenda === undefined)
    return {
      columna: 'leyenda',
      contenido: dato(m.id, 'descripcion'),
      estilo,
      medida: m.descripcion ?? '',
    }
  if (leyenda === '') return { columna: 'leyenda', contenido: { tipo: 'vacio' }, estilo }
  return { columna: 'leyenda', contenido: texto(leyenda), estilo, medida: leyenda }
}

// La fila de un miembro: el concepto (la etiqueta escrita o la del nodo), el monto y la leyenda (la escrita, vacía o la descripción del nodo).
function delMiembro(c: Conversion, m: NodoParaPlantilla, fondo: string | null): Pieza[] {
  const etiqueta = escrito(c.plantilla.etiquetas, m.id)
  const concepto = conFondo(fondo, { bordes: FINO })
  return [
    conTexto(etiqueta)
      ? { columna: 'concepto', contenido: texto(etiqueta), estilo: concepto, medida: etiqueta }
      : {
          columna: 'concepto',
          contenido: dato(m.id, 'etiqueta'),
          estilo: concepto,
          medida: m.etiqueta ?? '',
        },
    {
      columna: 'monto',
      contenido: dato(m.id, 'monto'),
      estilo: conFondo(fondo, { negrita: true, alinear: 'derecha', bordes: FINO }),
    },
    ...(c.a.tiene('leyenda') ? [leyendaDe(c, m, fondo)] : []),
  ]
}

// Lo que va una vez por grupo, en la fila de su primer miembro: el título (que abarca las filas del grupo), el tipo de cambio y el plazo. El plazo se conoce
// (es del grupo): cuenta para el alto, como un texto (un grupo de un miembro no lo corta).
function delGrupo(
  c: Conversion,
  {
    g,
    m,
    fondo,
    filas,
  }: { g: GrupoDePlantilla; m: NodoParaPlantilla; fondo: string | null; filas: number },
) {
  const deLaFormula = (c.contexto.definicion.grupos ?? []).find((x) => x.id === g.grupo)
  const etiqueta = deLaFormula?.etiqueta
  const titulo = etiqueta != null && etiqueta !== '' ? etiqueta : g.grupo
  const plazo = typeof deLaFormula?.plazo === 'string' ? deLaFormula.plazo : undefined
  const lateral = conFondo(fondo, { alinear: 'centro', bordes: FINO })
  const titular: Pieza = {
    columna: 'grupo',
    filas,
    contenido: texto(titulo),
    estilo: conFondo(fondo, { negrita: true, alinear_vertical: 'arriba', bordes: FINO }),
    medida: titulo,
  }
  const tipoDeCambio: Pieza[] = c.a.tiene('tipo_cambio')
    ? [{ columna: 'tipo_cambio', filas, contenido: dato(m.id, 'tc_nombre'), estilo: lateral }]
    : []
  const delPlazo: Pieza[] = c.a.tiene('plazo')
    ? [
        {
          columna: 'plazo',
          filas,
          contenido: dato(m.id, 'plazo'),
          estilo: lateral,
          ...(plazo === undefined ? {} : { medida: plazo }),
        },
      ]
    : []
  return { titular, laterales: [...tipoDeCambio, ...delPlazo] }
}

// Un grupo con miembros: una fila por miembro, en el orden de la fórmula, con el color del grupo. El título, el tipo de cambio y el plazo van una vez, en la
// primera, abarcando las filas del grupo (D5: se acortan solas si se ocultan miembros).
export function grupo(c: Conversion, g: GrupoDePlantilla): void {
  const fondo = fondoDe(c, g)
  const suyos = miembrosDe(c.nodos, g.grupo)
  for (const [i, m] of suyos.entries()) {
    const primera = i === 0 ? delGrupo(c, { g, m, fondo, filas: suyos.length }) : null
    const piezas: Pieza[] =
      primera === null
        ? delMiembro(c, m, fondo)
        : [primera.titular, ...delMiembro(c, m, fondo), ...primera.laterales]
    c.a.fila(idDeLaFila('n', m.id), piezas, m.id)
  }
}

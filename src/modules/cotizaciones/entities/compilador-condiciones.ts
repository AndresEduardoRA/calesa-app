// Las funciones del texto que comparan (docs/COTIZADOR.md › «Fórmulas como texto»): SI con una condición y su rama «si no», Y, O,
// MAX y MIN. `SI(bandera; x)` sigue siendo el `si` de siempre; cualquier otro SI es un `elegir`, con la condición primera en `hijos`
// (va primera en el texto, y así sale primera entre las auxiliares).
import {
  demasiadosTerminos,
  errorEn,
  esError,
  faltaUnValor,
  type Arbol,
  type ErrorCrudo,
  type Rango,
} from './compilador-arbol'
import { calculo, expandirGrupo, invalido, type Contar } from './compilador-argumentos'
import type { Nombres } from './compilador-nombres'
import { recorrer } from './medidor'
import { esCondicion, OPS_DE_CONDICION, type Nodo } from './nodos'

const DE_CONDICION = new Set<string>(OPS_DE_CONDICION)

// El ejemplo del mensaje, con el nombre que escribió la persona: `remate>1000`, o `variante="a"` para la variante.
const ejemplo = (n: Nodo) =>
  n.tipo === 'opcion' ? `${n.id}="${n.opciones[0]?.clave ?? 'a'}"` : `${n.id}>1000`

// Una condición es una bandera, una comparación, Y u O, escrita ahí o en una fila anterior. Un SI no lo es.
function revisarCondicion(c: Arbol, funcion: string): ErrorCrudo | undefined {
  if (c.k === 'calc') return DE_CONDICION.has(c.op) ? undefined : invalido(c, 'condicion')
  if (c.k !== 'ref') return invalido(c, 'condicion')
  if (esCondicion(c.nodo)) return undefined
  return errorEn(c, 'no_es_condicion', { nombre: funcion, texto: ejemplo(c.nodo) })
}

export function cerrarSi(args: Arbol[], rango: Rango): Arbol | ErrorCrudo {
  const [c, x, y] = args
  if (c === undefined || x === undefined) return faltaUnValor(rango)
  const malo = revisarCondicion(c, 'SI')
  if (malo !== undefined) return malo
  if (y === undefined && c.k === 'ref' && c.nodo.tipo === 'bandera') {
    return calculo('si', rango, [x], { campos: { condicion: c.nodo.id } })
  }
  return calculo('elegir', rango, y === undefined ? [c, x] : [c, x, y])
}

// Y, O: cada argumento, una condición.
export function cerrarLogica(
  op: 'y' | 'o',
  args: Arbol[],
  rango: Rango,
  { nombres, contar }: { nombres: Nombres; contar: Contar },
): Arbol | ErrorCrudo {
  for (const a of recorrer(args, nombres.m)) {
    const malo = revisarCondicion(a, op === 'y' ? 'Y' : 'O')
    if (malo !== undefined) return malo
  }
  if (!contar(args.length)) return demasiadosTerminos(rango)
  return calculo(op, rango, args)
}

// MAX, MIN: dos valores o más, o un grupo solo (sus miembros, como SUMA).
export function cerrarExtremo(
  op: 'max' | 'min',
  args: Arbol[],
  r: { rango: Rango; nombreRango: Rango },
  { nombres, contar }: { nombres: Nombres; contar: Contar },
): Arbol | ErrorCrudo {
  const [primero] = args
  if (args.length === 1) {
    if (primero?.k !== 'clave') {
      return errorEn(r.nombreRango, 'cantidad_de_argumentos', {
        nombre: op === 'max' ? 'MAX' : 'MIN',
        minimo: 2,
        esperado: 'el nombre de un grupo solo',
      })
    }
    const hijos = expandirGrupo(primero, nombres, contar)
    return esError(hijos) ? hijos : calculo(op, r.rango, hijos)
  }
  if (!contar(args.length)) return demasiadosTerminos(r.rango)
  return calculo(op, r.rango, args)
}

// Los números del texto (`compilador-sintaxis.ts`): un literal, el menos pegado a un número y el «%» que lo sigue.
import { error, type ErrorCrudo, type Numero } from './compilador-arbol'
import { enToken, mirar, textoDe, tomar, type Estado } from './compilador-estado'
import { T, valorDeNumero, type Token } from './compilador-lexico'

function empujarNumero(
  e: Estado,
  t: Token,
  desde: number,
  negativo: boolean,
): ErrorCrudo | undefined {
  const v = valorDeNumero(e.lex, t, false)
  if (v === null)
    return error('numero_fuera_de_rango', desde, t.hasta, {
      texto: textoDe(e, { desde, hasta: t.hasta }),
    })
  const valor = negativo ? -v : v
  const n: Numero = {
    k: 'num',
    valor: valor === 0 ? 0 : valor,
    pct: false,
    comoPct: false,
    negativo,
    numDesde: t.desde,
    numHasta: t.hasta,
    paren: false,
    desde,
    hasta: t.hasta,
  }
  e.operandos.push(n)
  e.esperaValor = false
  e.ultimaNum = true
  return undefined
}

export function numero(e: Estado, t: Token): ErrorCrudo | undefined {
  if (!e.esperaValor) return enToken(t, 'falta_un_operador')
  return empujarNumero(e, t, t.desde, false)
}

// El signo menos sólo se pega a un número: «-5», «a - -5». No hay negación de un nombre ni de un paréntesis.
export function menosUnario(e: Estado, t: Token): ErrorCrudo | undefined {
  if (t.t === T.MENOS) {
    const sig = mirar(e)
    if (sig.t === T.NUM && sig.desde === t.hasta) {
      tomar(e)
      return empujarNumero(e, sig, t.desde, true)
    }
  }
  return enToken(t, 'operador_suelto', { texto: textoDe(e, t) })
}

export function porciento(e: Estado, t: Token): ErrorCrudo | undefined {
  const ultimo = e.operandos[e.operandos.length - 1]
  if (e.esperaValor || !e.numPrevio || ultimo?.k !== 'num')
    return enToken(t, 'porcentaje_sin_numero')
  // Correr el punto a la izquierda achica el número: el texto pudo caber solo y redondearse a 0 con el «%» (`1e-323%`).
  const v = valorDeNumero(e.lex, { desde: ultimo.numDesde, hasta: ultimo.numHasta }, true)
  if (v === null)
    return error('numero_fuera_de_rango', ultimo.desde, t.hasta, {
      texto: textoDe(e, { desde: ultimo.desde, hasta: t.hasta }),
    })
  const valor = ultimo.negativo ? -v : v
  ultimo.valor = valor === 0 ? 0 : valor
  ultimo.pct = true
  ultimo.hasta = t.hasta
  e.ultimaNum = false
  return undefined
}

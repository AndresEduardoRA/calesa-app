'use client'

import { telefonoDeFicha } from '../../../entities/ficha'
import {
  numeroConCodigo,
  resolverTelefono,
  textoDelPais,
} from '../../../entities/pais-del-telefono'
import { usePaises } from '../../telefono/hooks/use-paises'

// Un número de la ficha: enlace de llamada para la cartera, texto para quien lo ve enmascarado. La
// base ya entregó cada número como corresponde. Con la tabla de países (se pide después de
// hidratar: el documento no cambia) el número se parte por su código y dice de qué país es, también
// el de otro país. El enmascarado («•») no lleva país: con tres dígitos no es seguro. `sinPais`: el
// país ya se dice aparte (los datos clave de la ficha), el número sólo se parte por su código.
export function NumeroDeTelefono({
  numero,
  codigoDePais,
  llamable,
  sinPais = false,
}: {
  numero: string
  codigoDePais: string | null
  llamable: boolean
  sinPais?: boolean
}) {
  const tabla = usePaises(numero !== '' && !numero.includes('•'))
  let texto = telefonoDeFicha(numero, codigoDePais)
  let pais: string | null = null
  if (tabla !== null) {
    const resuelto = resolverTelefono(tabla, {
      numero,
      internacional: true,
      empresa: { telefonoCc: null, pais: null },
    })
    texto = numeroConCodigo(numero, resuelto.codigo)
    pais = resuelto.pais.tipo === 'desconocido' ? null : textoDelPais(resuelto.pais)
  }
  const numeroVisible =
    !llamable || numero === '' ? (
      <span className="tabular-nums">{texto}</span>
    ) : (
      <a
        href={`tel:+${numero}`}
        className="text-(--color-primario-ink) tabular-nums underline-offset-2 hover:underline"
      >
        {texto}
      </a>
    )
  return (
    <>
      {numeroVisible}
      {pais && !sinPais ? <span className="text-(--color-ink-soft)"> · {pais}</span> : null}
    </>
  )
}

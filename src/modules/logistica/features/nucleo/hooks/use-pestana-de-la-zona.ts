'use client'

import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { useState } from 'react'
import { ORDEN_DE_HUECOS } from '../../../entities/nucleo/hueco'
import { CLAVE_DEL_HUECO_ABIERTO } from '../../../entities/nucleo/enlaces'
import { CLAVE_DE_SUBIR } from '../../../entities/nucleo/paneles-de-la-unidad'
import { pestanaDelHueco, pestanaInicial } from '../../../entities/nucleo/zonas'

// La zona de pestañas abre en Documentos con `?subir=` para que su hueco esté montado; `SubidaDeLaUnidad` usa la misma clave.
export { CLAVE_DE_SUBIR }

type Pestana = { clave: string; huecos: readonly { clave: string }[] }

// La pestaña elegida de una zona. Manda, en este orden: el hueco de la URL (`?hueco=`) si es de esta zona; lo último que se eligió aquí (memoria local: la otra zona comparte la misma clave de la URL y
// escribirla no debe borrar lo que se eligió aquí); la pestaña de `?subir=`; la primera. Elegir escribe `?hueco=<primer hueco de la pestaña>` y, al elegir la primera, quita la clave. Va shallow y con
// `replace`: el servidor no depende de la pestaña, así que un viaje por cambio no aporta nada, y ir y venir entre pestañas no llena el historial.
export function usePestanaDeLaZona(pestanas: readonly Pestana[]) {
  const [huecoDeLaUrl, setHuecoDeLaUrl] = useQueryState(
    CLAVE_DEL_HUECO_ABIERTO,
    parseAsStringLiteral(ORDEN_DE_HUECOS).withOptions({ shallow: true, history: 'replace' }),
  )
  const [subir] = useQueryState(CLAVE_DE_SUBIR, parseAsString)
  const [ultima, setUltima] = useState<string | null>(null)
  const delUrl = pestanaDelHueco(huecoDeLaUrl)
  const existe = (clave: string | null): clave is string =>
    clave !== null && pestanas.some((p) => p.clave === clave)
  // Lo que pidió la URL también se recuerda: si la otra zona escribe `?hueco=` después, ésta no vuelve a su primera pestaña.
  if (existe(delUrl) && ultima !== delUrl) setUltima(delUrl)
  const activa = existe(delUrl)
    ? delUrl
    : existe(ultima)
      ? ultima
      : (pestanaInicial(pestanas, null, subir !== null) ?? '')
  const elegir = (clave: string) => {
    setUltima(clave)
    const primera = pestanas[0]?.clave === clave
    const hueco = pestanas.find((p) => p.clave === clave)?.huecos[0]?.clave ?? null
    void setHuecoDeLaUrl(
      primera || hueco === null ? null : (hueco as (typeof ORDEN_DE_HUECOS)[number]),
    )
  }
  return { activa, elegir }
}

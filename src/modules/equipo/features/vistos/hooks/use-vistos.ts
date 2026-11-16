'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  conAbierto,
  consultasDeLaFirma,
  firmaDeConsultas,
  idsCubiertosDeLaFirma,
  marcaDeVisto,
  SIN_VISTOS,
  unidas,
  type ConsultaDeVistos,
  type LecturaDeVistos,
  type MarcaDeVisto,
  type ModuloDeVistos,
  type TipoDeVistos,
} from '../../../entities/vistos'
import { usePreferenciaDeVistos } from '../components/proveedor-de-vistos'
import { leerVistosAlUsar, registrarVistoAlUsar } from '../pedidos-de-vistos'

// Las marcas de una pantalla: una lectura por página (`vistos_de`, con los ids que se dibujan, por tipo) y, al abrir una fila, la marca al
// instante y el registro en la base (que no vuelve a escribir el mismo dentro de 30 s). El último es el del módulo, de cualquiera de sus tipos.
// Con «Vistos» apagado ni lee ni escribe, ni pide el código de la E/S. La lectura corre otra vez al volver a una pantalla conservada.
export function useVistos(modulo: ModuloDeVistos, consultas: readonly ConsultaDeVistos[]) {
  const preferencia = usePreferenciaDeVistos()
  // Lo leído de la base y lo abierto en esta pestaña, aparte: una lectura que llega tarde no borra lo recién abierto.
  // La firma de lo leído: una lectura de otra página (o aún sin llegar) no dice qué falta por ver aquí.
  const [leida, setLeida] = useState<{ firma: string | null; lectura: LecturaDeVistos }>({
    firma: null,
    lectura: SIN_VISTOS,
  })
  const [local, setLocal] = useState<LecturaDeVistos>(SIN_VISTOS)
  const firma = firmaDeConsultas(consultas)

  useEffect(() => {
    if (!preferencia.activado || firma === '') return
    let vigente = true
    void leerVistosAlUsar(modulo, consultasDeLaFirma(firma)).then((nueva) => {
      // Una lectura que falla deja la pantalla sin marcas (ni «nuevo»), nunca con las de otra página.
      if (vigente) setLeida({ firma: nueva === null ? null : firma, lectura: nueva ?? SIN_VISTOS })
    })
    return () => {
      vigente = false
    }
  }, [modulo, firma, preferencia.activado])

  const abrir = useCallback(
    (tipo: TipoDeVistos, id: string) => {
      if (!preferencia.activado) return
      setLocal((actual) => conAbierto(actual, id))
      void registrarVistoAlUsar(modulo, tipo, id)
    },
    [modulo, preferencia.activado],
  )

  const marca = useMemo(() => {
    const llegada = firma !== '' && leida.firma === firma
    const cubiertos = llegada ? idsCubiertosDeLaFirma(firma) : null
    // Una pantalla conservada que se queda sin filas no arrastra el último de la anterior.
    const base = firma === '' ? SIN_VISTOS : leida.lectura
    const total = unidas(base, local)
    return (id: string): MarcaDeVisto =>
      marcaDeVisto(id, total, preferencia, cubiertos?.has(id) ?? false)
  }, [firma, leida, local, preferencia])
  return { marca, abrir }
}

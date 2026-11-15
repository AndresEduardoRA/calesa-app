'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { ProveedorDeVistosDeLista } from '@/shared/ui/lista'
import {
  consultasDeLaFirma,
  idDeLaUrl,
  type ConsultaDeVistos,
  type ModuloDeVistos,
} from '../../../entities/vistos'
import { useVistos } from '../hooks/use-vistos'

type ConsultaDeLaPagina = ConsultaDeVistos & {
  // El parámetro de la URL que abre el detalle de este tipo sobre la lista (`?cotizacion=`, `?evento=`): verlo ahí lo marca visto.
  parametro?: string
}

// Las marcas de «visto» de una pantalla de otro módulo, montadas desde `src/app` con los ids que la página ya leyó en el servidor. Cada
// consulta es un tipo (la agenda tiene dos); un `parametro` presente en la URL con un id válido cuenta como abrirlo, una vez por apertura.
// Va dentro del `<Suspense>` de la página: lee `useSearchParams()`.
export function MarcasDeVistoDeLaPagina({
  modulo,
  consultas,
  children,
}: {
  modulo: ModuloDeVistos
  consultas: readonly ConsultaDeLaPagina[]
  children: ReactNode
}) {
  const { marca, abrir } = useVistos(modulo, consultas)
  const params = useSearchParams()
  // Lo que abre la URL, con el formato de la firma (`tipo:id|tipo:id`): el efecto depende de este texto y no de la identidad de `consultas`.
  const abiertos = consultas
    .flatMap(({ tipo, parametro }) => {
      const id = parametro === undefined ? null : idDeLaUrl(params.get(parametro))
      return id === null ? [] : [`${tipo}:${id}`]
    })
    .join('|')
  useEffect(() => {
    for (const { tipo, ids } of consultasDeLaFirma(abiertos)) {
      for (const id of ids) abrir(tipo, id)
    }
  }, [abiertos, abrir])
  return <ProveedorDeVistosDeLista marca={marca}>{children}</ProveedorDeVistosDeLista>
}

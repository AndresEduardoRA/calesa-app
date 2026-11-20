'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { pedidoDe } from '@/shared/lib/acciones-del-aviso'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import type { GuardarLaPlantilla } from '../hooks/use-guardar-la-plantilla'

type Props = {
  // Lo que se corrigió al abrir (C2/C3) y lo de los tonos que ya no están, en ese orden.
  deLaLectura: readonly string[]
  // Lo que `completa` rechaza y la forma no: no apaga «Guardar», avisa que publicar no pasaría.
  paraPublicar: string | null
  guardar: GuardarLaPlantilla
  // La misma URL: se abre en otra pestaña con lo que guardó la otra persona, sin perder lo tipeado.
  hrefVer: string
  // El logo de la empresa no se pudo dibujar en el lienzo (la imagen de la referencia no cargó).
  logoRoto: boolean
  // `empresa.ajustes.gestionar`: el aviso abre Empresa; sin él, dice a quién pedírselo.
  puedeCambiarElLogo: boolean
}

export const LOGO_ROTO = 'El logo de la empresa no se pudo dibujar: súbelo de nuevo en Empresa.'

function AvisoDelLogo({ puedeCambiarElLogo }: { puedeCambiarElLogo: boolean }) {
  return (
    <Aviso tono="aviso">
      {LOGO_ROTO}{' '}
      {puedeCambiarElLogo ? (
        <Link
          href={RUTAS.empresa as Route}
          className="inline-flex min-h-11 items-center underline md:min-h-0"
        >
          Abrir Empresa
        </Link>
      ) : (
        pedidoDe('cambiar el logo')
      )}
    </Aviso>
  )
}

// Lo que el editor dice arriba, en este orden: lo corregido al abrir, lo de los tonos, lo que impediría publicar, el logo que no se pudo dibujar y lo que pasó al
// guardar (sin conexión, conflicto, un rechazo que no es de un campo).
export function AvisosDelEditor({
  deLaLectura,
  paraPublicar,
  guardar,
  hrefVer,
  logoRoto,
  puedeCambiarElLogo,
}: Props) {
  return (
    <>
      {deLaLectura.map((texto) => (
        <Aviso key={texto} tono="aviso">
          {texto}
        </Aviso>
      ))}
      {paraPublicar === null ? null : (
        <Aviso tono="aviso">Con esto no se podría publicar: {paraPublicar}</Aviso>
      )}
      {logoRoto ? <AvisoDelLogo puedeCambiarElLogo={puedeCambiarElLogo} /> : null}
      <AvisosDelFormulario
        enLinea={guardar.enLinea}
        esperandoConexion={guardar.esperandoConexion}
        enCurso={guardar.enCurso}
        conflicto={guardar.conflicto}
        aviso={guardar.aviso}
        hrefVer={hrefVer}
        alReintentar={guardar.reintentar}
        alRecargar={guardar.recargar}
      />
    </>
  )
}

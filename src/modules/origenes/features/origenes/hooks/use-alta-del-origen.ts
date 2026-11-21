'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { useSalidaConCambios } from '@/shared/ui/use-salida-con-cambios'
import type { TipoDeOrigen } from '../../../entities/origen'
import { useOrigenes } from './use-origenes'
import { COLOR_INICIAL, useValoresDeOrigen } from './use-valores-de-origen'

const SIN_DESCARTE = () => undefined

// El estado de la página del alta: el tipo, los valores, los errores por campo (el duplicado, en el nombre) y la salida con cambios. Al crear lleva al paso
// Campos de la puesta en marcha; desde ahí lo escrito ya no es un cambio sin guardar y todo queda apagado.
export function useAltaDelOrigen() {
  const router = useRouter()
  const ediciones = useOrigenes()
  const [tipo, setTipo] = useState<TipoDeOrigen>('manual')
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const [creado, setCreado] = useState(false)
  const { valores, cambiar } = useValoresDeOrigen(
    { nombre: '', sustantivo: 'vehículo', genero: 'm', color: COLOR_INICIAL, plataformas: [] },
    false,
  )
  const hayCambios =
    !creado &&
    (tipo !== 'manual' ||
      valores.nombre !== '' ||
      valores.sustantivo !== 'vehículo' ||
      valores.genero !== 'm' ||
      valores.color !== COLOR_INICIAL ||
      valores.plataformas.length > 0)
  const salida = useSalidaConCambios(hayCambios, SIN_DESCARTE)
  const errores = ediciones.errores.crear

  async function crear(elemento: HTMLFormElement) {
    setErrorDeNombre(undefined)
    const resultado = await ediciones.crear({
      ...valores,
      tipo,
      plataformas: tipo === 'subasta' ? valores.plataformas : [],
    })
    if (resultado.ok) {
      setCreado(true)
      router.push(rutaDeLaPuestaEnMarcha(resultado.data.id, 'campos'))
      return
    }
    if (resultado.error.codigo === 'duplicado') {
      setErrorDeNombre(resultado.error.mensaje)
    }
    enfocarPrimerError(elemento)
  }

  return {
    tipo,
    elegirTipo: setTipo,
    valores,
    cambiar: (parcial: Parameters<typeof cambiar>[0]) => {
      if (parcial.nombre !== undefined) {
        setErrorDeNombre(undefined)
      }
      cambiar(parcial)
    },
    errores: {
      nombre: errorDeNombre ?? errorDeCampo(errores, 'nombre'),
      sustantivo: errorDeCampo(errores, 'sustantivo'),
      color: errorDeCampo(errores, 'color'),
      plataformas: errorDeCampo(errores, 'plataformas'),
    },
    salida,
    apagado: ediciones.enCurso || creado,
    crear,
  }
}

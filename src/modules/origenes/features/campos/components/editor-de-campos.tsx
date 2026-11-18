'use client'

import { useId } from 'react'
import { EditorDeCampos as EditorCompartido } from '@/shared/ui/campos'
import type { CampoDeLayout } from '../../../entities/campo'
import {
  DATOS_COMUNES,
  MENSAJE_TOPE_DE_DATOS_CLAVE,
  TOPE_DE_DATOS_CLAVE,
  datosComunesDe,
  type DatoClave,
} from '../../../entities/datos-clave'
import {
  MOTIVO_SIN_PERMISO_DATOS_CLAVE,
  esDatoClave,
  motivoParaNoMarcar,
} from '../../../entities/datos-clave-edicion'
import type { TipoDeOrigen } from '../../../entities/origen'
import { configuracionDeOrigen } from '../configuracion'
import { useCampos } from '../hooks/use-campos'
import { useDatosClave } from '../hooks/use-datos-clave'
import {
  BloqueDeDatosClave,
  DatosComunes,
  EstrellaDeDatoClave,
  type DatoClaveDeLaLista,
} from './datos-clave'

type Props = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly CampoDeLayout[]
  puedeGestionar: boolean
  // Los datos clave guardados y la versión del origen con la que se guardan.
  datosClave: readonly DatoClave[]
  versionDelOrigen: string
}

const llaveDe = (dato: DatoClave) =>
  'comun' in dato ? `comun:${dato.comun}` : `campo:${dato.campo}`

// La parte «Campos» de un origen: arriba los datos clave en orden, después los datos comunes con su estrella y el editor compartido del
// layout (las banderas, los textos y las operaciones de los vehículos), con la estrella en cada campo activo.
export function EditorDeCampos(props: Props) {
  const { origenId, tipoDeOrigen, campos, puedeGestionar, datosClave, versionDelOrigen } = props
  const ediciones = useCampos()
  const datos = useDatosClave({ origenId, datosClave, versionDelOrigen })
  const idDelMotivo = useId()
  const actual = campos.find((campo) => campo.principal)
  const principal = actual === undefined ? null : { clave: actual.clave, etiqueta: actual.etiqueta }

  const enLaLista: DatoClaveDeLaLista[] = datos.lista.map((dato) => {
    if ('comun' in dato) {
      const comun = DATOS_COMUNES.find((otro) => otro.clave === dato.comun)
      return {
        llave: llaveDe(dato),
        etiqueta: comun?.etiqueta ?? dato.comun,
        deDonde: 'Dato común',
      }
    }
    const campo = campos.find((otro) => otro.clave === dato.campo)
    return {
      llave: llaveDe(dato),
      etiqueta: campo?.etiqueta ?? dato.campo,
      deDonde: campo?.grupo ? `Campo · ${campo.grupo}` : 'Campo',
    }
  })
  // El motivo visible de lo apagado: sin permiso, todo; con 4, las estrellas de los demás.
  const motivo = !puedeGestionar
    ? MOTIVO_SIN_PERMISO_DATOS_CLAVE
    : datos.lista.length >= TOPE_DE_DATOS_CLAVE
      ? MENSAJE_TOPE_DE_DATOS_CLAVE
      : null
  // Sólo se apunta al motivo cuando está escrito (con un cambio en vuelo no hay motivo: no queda una referencia rota).
  const describir = motivo === null ? undefined : idDelMotivo
  const apagada = (dato: DatoClave) =>
    datos.enCurso || motivoParaNoMarcar({ lista: datos.lista, dato, puedeGestionar }) !== null

  return (
    <div className="grid gap-6">
      <BloqueDeDatosClave
        datos={enLaLista}
        motivo={motivo}
        idDelMotivo={idDelMotivo}
        apagado={!puedeGestionar || datos.enCurso}
        alMover={datos.mover}
        alQuitar={(indice) => {
          const dato = datos.lista[indice]
          if (dato) datos.quitar(dato)
        }}
      />
      <DatosComunes
        comunes={datosComunesDe(tipoDeOrigen)}
        marcado={(clave) => esDatoClave(datos.lista, { comun: clave })}
        apagada={(clave) => apagada({ comun: clave })}
        idDelMotivo={describir}
        alAlternar={(clave) => {
          datos.alternar({ comun: clave })
        }}
      />
      <EditorCompartido
        campos={campos}
        puedeGestionar={puedeGestionar}
        configuracion={configuracionDeOrigen({
          origenId,
          tipoDeOrigen,
          principal,
          accionDeFila: (campo) =>
            campo.activo ? (
              <EstrellaDeDatoClave
                etiqueta={campo.etiqueta}
                marcado={esDatoClave(datos.lista, { campo: campo.clave })}
                apagada={apagada({ campo: campo.clave })}
                idDelMotivo={describir}
                alAlternar={() => {
                  datos.alternar({ campo: campo.clave })
                }}
              />
            ) : null,
        })}
        ediciones={ediciones}
      />
    </div>
  )
}

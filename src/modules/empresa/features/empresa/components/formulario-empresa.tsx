'use client'

import { useRef, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { useBorrador } from '@/shared/ui/use-borrador'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { Moneda } from '../../../entities/tipos-cambio'
import {
  CAMPOS_DE_AJUSTES,
  useGuardarAjustes,
  type LogoElegido,
} from '../hooks/use-guardar-ajustes'
import { useHayCambiosEnAjustes } from '../hooks/use-hay-cambios-en-ajustes'
import { CamposDeEmpresa } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  // URL pública del logo guardado, ya armada en el servidor.
  logoUrl: string | null
  logoOscuroUrl: string | null
  // Las monedas activas, para elegir la base.
  monedas: readonly Moneda[]
  zonas: readonly string[]
  conDatosCargados: boolean
  puedeEditar: boolean
}

const ID_DEL_FORMULARIO = 'formulario-empresa'

// Marca, datos legales, región y políticas en un solo formulario con una versión, que se guarda con la barra de cambios sin guardar.
// Quien lo usa le pone de `key` la huella de lo guardado (`huellaDelFormulario()`): cuando eso
// cambia (lo guardó esta persona u otra), el formulario arranca de nuevo de lo guardado. La
// versión llega por props: que se regeneren los íconos, que son la misma fila, no lo reinicia.
// «Descartar» vuelve a montar el formulario (`vuelta`): un solo camino repone los textos, el color, los logos y los interruptores.
export function FormularioEmpresa(props: Props) {
  const [vuelta, setVuelta] = useState(0)
  return (
    <FormularioDeAjustes
      key={vuelta}
      {...props}
      alReiniciar={() => {
        setVuelta((anterior) => anterior + 1)
      }}
    />
  )
}

// El formulario y, como hermana (`order-last`: va al final de la página y queda pegada abajo respecto de toda ella; en el DOM sigue
// después del formulario), la barra.
function FormularioDeAjustes(props: Props & { alReiniciar: () => void }) {
  const { ajustes, puedeEditar, conDatosCargados, alReiniciar } = props
  const formulario = useRef<HTMLFormElement>(null)
  const [logo, setLogo] = useState<LogoElegido>({ tipo: 'igual' })
  const [logoOscuro, setLogoOscuro] = useState<LogoElegido>({ tipo: 'igual' })
  const [registroAbierto, setRegistroAbierto] = useState(ajustes.registroAbierto)
  const [limpiezaAutomatica, setLimpiezaAutomatica] = useState(ajustes.limpiezaAutomatica)
  const enLinea = useEnLinea()
  const borrador = useBorrador('ajustes-empresa', formulario, CAMPOS_DE_AJUSTES, {
    activo: puedeEditar,
  })
  const { guardar, enCurso, errores } = useGuardarAjustes({
    logoRuta: ajustes.logoRuta,
    logoOscuroRuta: ajustes.logoOscuroRuta,
    actualizadoEn: ajustes.actualizadoEn,
    conDatosCargados,
    formulario,
    alGuardar: borrador.limpiar,
  })
  const hayCambios = useHayCambiosEnAjustes(formulario, {
    ajustes,
    logos: { claro: logo, oscuro: logoOscuro },
    interruptores: { registroAbierto, limpiezaAutomatica },
    puedeEditar,
    pausado: enCurso,
  })

  return (
    <>
      <form
        ref={formulario}
        id={ID_DEL_FORMULARIO}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar({ claro: logo, oscuro: logoOscuro }, { registroAbierto, limpiezaAutomatica })
        }}
      >
        {enLinea ? null : (
          <Aviso tono="aviso">
            No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
          </Aviso>
        )}
        <CamposDeEmpresa
          {...props}
          enCurso={enCurso}
          logo={logo}
          alCambiarLogo={setLogo}
          logoOscuro={logoOscuro}
          alCambiarLogoOscuro={setLogoOscuro}
          registroAbierto={registroAbierto}
          alCambiarRegistro={setRegistroAbierto}
          limpiezaAutomatica={limpiezaAutomatica}
          alCambiarLimpieza={setLimpiezaAutomatica}
          errores={errores}
        />
      </form>
      <BarraDeCambiosSinGuardar
        className="order-last"
        formulario={ID_DEL_FORMULARIO}
        hayCambios={hayCambios}
        guardando={enCurso}
        alDescartar={() => {
          borrador.limpiar()
          alReiniciar()
        }}
      />
    </>
  )
}

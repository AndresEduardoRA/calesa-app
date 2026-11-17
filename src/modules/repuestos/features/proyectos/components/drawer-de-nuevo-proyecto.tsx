'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { LectorDelLeadDelVehiculo } from '../hooks/use-cliente-del-vehiculo'
import { useFormularioDeProyecto, type ElegidoInicial } from '../hooks/use-formulario-de-proyecto'
import { useLeadDelAlta, type LeadDeLaUrl } from '../hooks/use-lead-del-alta'
import { CamposDeProyecto } from './campos-de-proyecto'
import type { BuscadorDeProyecto } from './tipos-del-buscador'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza de cero: un id de intento nuevo y los campos vacíos.
  apertura: number
  // El vehículo con que se abrió (`?vehiculo=`), ya resuelto y visible; o el aviso si no se encontró.
  vehiculoInicial: ElegidoInicial | null
  avisoDelVehiculo: string | null
  puedeVerLeads: boolean
  buscadorDeVehiculo: BuscadorDeProyecto
  buscadorDeLead: BuscadorDeProyecto
  // Con `leads.ver`: el lead vinculado al vehículo, que se propone en «De un vehículo».
  leerLeadDelVehiculo: LectorDelLeadDelVehiculo | null
  // Con `leads.ver` y `leads.crear`: deja el formulario en la URL y abre el alta del shell. Nulo, sin «Nuevo lead».
  alNuevoLead: (() => void) | null
  // El lead de `?lead=` (el que dejó el alta al guardar) y cómo lo resolvió el servidor.
  leadDelAlta: LeadDeLaUrl
}

type PropsDelFormulario = Omit<Props, 'apertura'>

function Formulario(p: PropsDelFormulario) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDeProyecto({
    vehiculoInicial: p.vehiculoInicial,
    abierto: p.abierto,
    puedeVerLeads: p.puedeVerLeads,
    leerLeadDelVehiculo: p.puedeVerLeads ? p.leerLeadDelVehiculo : null,
  })
  // Después del borrador: el lead que deja el alta pisa lo que el borrador repuso.
  const delAlta = useLeadDelAlta({
    lead: p.leadDelAlta,
    puedeVerLeads: p.puedeVerLeads,
    alElegir: f.elegirLead,
  })
  // Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(f.hayCambios, f.descartarBorrador)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={f.enLinea}
          esperandoConexion={f.esperandoConexion}
          enCurso={f.enCurso}
          conflicto={null}
          aviso={f.aviso}
          alReintentar={() => void f.enviar()}
          alRecargar={p.alCerrar}
        />
        <CamposDeProyecto
          valores={f.valores}
          errores={f.errores}
          disabled={f.enCurso}
          puedeVerLeads={p.puedeVerLeads}
          avisoDelVehiculo={p.avisoDelVehiculo}
          escribir={f.escribir}
          elegirOrigen={f.elegirOrigen}
          elegirVehiculo={f.elegirVehiculo}
          elegirLead={f.elegirLead}
          buscadorDeVehiculo={p.buscadorDeVehiculo}
          buscadorDeLead={p.buscadorDeLead}
          alNuevoLead={p.alNuevoLead}
          estadoDelCliente={{
            vinculado: f.valores.leadDelVehiculo,
            buscando: f.buscandoElCliente,
            sinTraer: f.clienteSinTraer,
            trayendo: delAlta.trayendo,
            aviso: delAlta.aviso,
          }}
        />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={p.alCerrar}
        etiquetaDeGuardar="Crear proyecto"
      />
    </div>
  )
}

// El formulario «Nuevo proyecto» (`?panel=nuevo-proyecto`): de un vehículo o externo, con su cliente. Se queda montado (cerrado) y cada apertura remonta el formulario con su
// `key`: id de intento nuevo y campos vacíos. Los buscadores, el lead del vehículo y «Nuevo lead» los arma `src/app` y llegan como funciones. Rumbo al alta el drawer se
// esconde sin devolver el foco (el alta lo toma) y, al volver, el borrador repone lo escrito. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDeNuevoProyecto({ apertura, alNuevoLead, ...resto }: Props) {
  // Fuera del formulario: se desmonta al esconderse y esto tiene que durar hasta que el drawer termina de cerrarse.
  const haciaElAlta = useRef(false)
  useEffect(() => {
    if (resto.abierto) {
      haciaElAlta.current = false
    }
  }, [resto.abierto])
  const nuevoLead =
    alNuevoLead === null
      ? null
      : () => {
          haciaElAlta.current = true
          alNuevoLead()
        }
  return (
    <Drawer
      abierto={resto.abierto}
      alCerrar={resto.alCerrar}
      titulo="Nuevo proyecto"
      descripcion="Un proyecto junta los repuestos de un vehículo o de un cliente externo."
      ancho="amplio"
      focoAlCerrar={() => (haciaElAlta.current ? false : focoDeQuienAbrio())}
    >
      <Formulario key={apertura} alNuevoLead={nuevoLead} {...resto} />
    </Drawer>
  )
}

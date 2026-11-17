'use client'

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { cambiosDeEstado } from '@/shared/lib/borrador'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { OrigenDelProyecto } from '../../../entities/proyectos/borrador'
import { validarProyecto } from '../../../entities/proyectos/borrador'
import {
  FORMULARIO_VACIO,
  baseDelBorrador,
  conLead,
  conOrigen,
  conVehiculo,
  type Elegido,
  type EstadoDelFormulario,
} from '../../../entities/proyectos/cliente-del-formulario'
import { useClienteDelVehiculo, type LectorDelLeadDelVehiculo } from './use-cliente-del-vehiculo'
import { useEnvioDeProyecto } from './use-envio-de-proyecto'

export type { EstadoDelFormulario } from '../../../entities/proyectos/cliente-del-formulario'

export type ElegidoInicial = Elegido

type Args = {
  // El vehículo con que abre el formulario (`?vehiculo=`), ya resuelto por el servidor y visible para quien mira.
  vehiculoInicial: ElegidoInicial | null
  abierto: boolean
  // Con `leads.ver` el cliente es «Cliente (lead)»; sin él, el nombre y el teléfono escritos a mano (sólo en el externo).
  puedeVerLeads: boolean
  // Nulo sin `leads.ver`: no se propone el lead del vehículo.
  leerLeadDelVehiculo: LectorDelLeadDelVehiculo | null
}

type Texto = 'vehiculoEtiqueta' | 'vin' | 'clienteNombre' | 'clienteTelefono' | 'notas'

// Quita el motivo de los campos que cambian.
function sinErrores(errores: Record<string, string>, campos: readonly string[]) {
  const resto = { ...errores }
  for (const campo of campos) {
    delete resto[campo]
  }
  return resto
}

// Lo que la persona cambia: cada cambio pasa por su transición (`cliente-del-formulario.ts`) y quita el motivo de los campos que toca.
function cambiosDelFormulario(
  setValores: Dispatch<SetStateAction<EstadoDelFormulario>>,
  setErrores: Dispatch<SetStateAction<Record<string, string>>>,
) {
  const cambiar = (
    transicion: (antes: EstadoDelFormulario) => EstadoDelFormulario,
    campos: readonly string[],
  ) => {
    setValores(transicion)
    setErrores((antes) => sinErrores(antes, campos))
  }
  return {
    escribir: (campo: Texto, texto: string) => {
      cambiar((antes) => ({ ...antes, [campo]: texto }), [campo])
    },
    elegirOrigen: (origen: OrigenDelProyecto) => {
      cambiar((antes) => conOrigen(antes, origen), ['origen', 'leadId'])
    },
    elegirVehiculo: (vehiculo: Elegido | null) => {
      cambiar((antes) => conVehiculo(antes, vehiculo), ['vehiculoId', 'leadId'])
    },
    elegirLead: (lead: Elegido | null) => {
      cambiar((antes) => conLead(antes, lead), ['leadId'])
    },
  }
}

// El estado del formulario «Nuevo proyecto»: el borrador (en `sessionStorage`: son más de 6 campos) y el motivo junto a cada campo; el envío es de `useEnvioDeProyecto` y el lead
// por defecto de «De un vehículo», de `useClienteDelVehiculo`. Cada apertura trae un id de intento nuevo (`crypto.randomUUID()`) y los campos vacíos, o el vehículo con que se
// abrió. El lead propuesto por el vehículo no cuenta como escrito (`baseDelBorrador`).
export function useFormularioDeProyecto({
  vehiculoInicial,
  abierto,
  puedeVerLeads,
  leerLeadDelVehiculo,
}: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState<EstadoDelFormulario>(() =>
    vehiculoInicial
      ? conVehiculo({ ...FORMULARIO_VACIO, origen: 'vehiculo' }, vehiculoInicial)
      : FORMULARIO_VACIO,
  )
  const [valores, setValores] = useState<EstadoDelFormulario>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const guardado = useMemo(() => baseDelBorrador(inicial, valores), [inicial, valores])

  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: 'proyecto-nuevo',
    valores,
    guardado,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const cliente = useClienteDelVehiculo({ valores, setValores, leer: leerLeadDelVehiculo })
  const envio = useEnvioDeProyecto({
    intento,
    abierto,
    alGuardar: borrador.limpiar,
    alRechazarCampos: (porCampo) => {
      // Un lead que la base rechaza (no se ve, en la papelera o en el limbo) se suelta: el motivo queda junto al buscador vacío, que toma el foco.
      if ('leadId' in porCampo) {
        setValores((antes) => conLead(antes, null))
      }
      setErrores(porCampo)
    },
  })

  // Un segundo «Crear proyecto» mientras se espera el lead del vehículo no manda otro envío.
  const enviando = useRef(false)
  async function enviar(): Promise<boolean> {
    if (envio.enCurso || enviando.current) {
      return false
    }
    enviando.current = true
    try {
      // Si se está trayendo el lead del vehículo, se espera: no se crea sin el cliente que estaba por llegar.
      const actuales = await cliente.esperar(valores)
      const validado = validarProyecto(actuales, { conLead: puedeVerLeads })
      if (!validado.ok) {
        setErrores(validado.errores)
        return false
      }
      return await envio.mandar(validado.datos)
    } finally {
      enviando.current = false
    }
  }

  return {
    valores,
    errores,
    aviso: envio.aviso,
    enCurso: envio.enCurso,
    enLinea: envio.enLinea,
    esperandoConexion: envio.esperandoConexion,
    buscandoElCliente: cliente.buscando,
    clienteSinTraer: cliente.error,
    // Cerrar ahora perdería lo escrito: el drawer pregunta antes de salir por un aviso.
    hayCambios: Object.keys(cambiosDeEstado(valores, guardado)).length > 0,
    ...cambiosDelFormulario(setValores, setErrores),
    enviar,
    descartarBorrador: borrador.limpiar,
  }
}

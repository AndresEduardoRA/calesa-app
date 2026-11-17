'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import {
  conLeadDelVehiculo,
  type Elegido,
  type EstadoDelFormulario,
} from '../../../entities/proyectos/cliente-del-formulario'

// Lee el lead vinculado a un vehículo, bajo la RLS de quien mira (nulo: no tiene o no se ve). Lo compone `src/app` con `vehiculos`: este módulo no lo importa.
export type LectorDelLeadDelVehiculo = (vehiculoId: string) => Promise<Resultado<Elegido | null>>

type Args = {
  valores: EstadoDelFormulario
  setValores: Dispatch<SetStateAction<EstadoDelFormulario>>
  // Nulo: quien mira no tiene `leads.ver` y el campo no se dibuja.
  leer: LectorDelLeadDelVehiculo | null
}

type Lectura = { vehiculoId: string; promesa: Promise<Resultado<Elegido | null>> }

// El vehículo cuyo lead hay que proponer: el elegido en «De un vehículo» mientras el campo del cliente no se tocó; si no, ninguno.
function vehiculoAProponer(valores: EstadoDelFormulario, conLeer: boolean): string {
  return conLeer && valores.origen === 'vehiculo' && !valores.leadTocado ? valores.vehiculoId : ''
}

// El lead por defecto de «De un vehículo»: al elegir (o abrir con) un vehículo, se lee su lead vinculado y se propone con una actualización sobre el estado más
// nuevo (`conLeadDelVehiculo` ignora la respuesta de otro vehículo y respeta un campo tocado). `esperar(estado)` deja que «Crear proyecto» espere la lectura en
// curso y devuelve el estado con el lead ya puesto: así no se crea sin el cliente que se estaba trayendo. Un fallo no frena nada: el buscador sigue.
export function useClienteDelVehiculo({ valores, setValores, leer }: Args) {
  const vehiculoId = vehiculoAProponer(valores, leer !== null)
  const [leido, setLeido] = useState<{ vehiculoId: string; ok: boolean } | null>(null)
  const enCurso = useRef<Lectura | null>(null)

  useEffect(() => {
    if (vehiculoId === '' || leer === null) {
      enCurso.current = null
      return
    }
    let vigente = true
    const promesa = leer(vehiculoId)
    enCurso.current = { vehiculoId, promesa }
    void promesa.then((respuesta) => {
      if (!vigente) {
        return
      }
      if (respuesta.ok) {
        setValores((antes) => conLeadDelVehiculo(antes, vehiculoId, respuesta.data))
      }
      setLeido({ vehiculoId, ok: respuesta.ok })
    })
    return () => {
      vigente = false
    }
  }, [vehiculoId, leer, setValores])

  const terminada = leido !== null && leido.vehiculoId === vehiculoId
  return {
    buscando: vehiculoId !== '' && !terminada,
    error: vehiculoId !== '' && terminada && !leido.ok,
    esperar: async (estado: EstadoDelFormulario): Promise<EstadoDelFormulario> => {
      const lectura = enCurso.current
      if (lectura === null || lectura.vehiculoId !== vehiculoAProponer(estado, leer !== null)) {
        return estado
      }
      const respuesta = await lectura.promesa
      return respuesta.ok ? conLeadDelVehiculo(estado, lectura.vehiculoId, respuesta.data) : estado
    },
  }
}

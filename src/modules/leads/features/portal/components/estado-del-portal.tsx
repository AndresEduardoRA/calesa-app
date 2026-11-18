'use client'

import type { ReactNode } from 'react'
import { fechaRelativa, formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { AccesoDelCliente, AccesoVigente } from '../../../entities/portal'
import { nombreDeQuien } from '../../../entities/portal-mensaje'

const CODIGO = 'font-mono tracking-wider text-(--color-ink)'

function Lineas({ principal, detalle }: { principal: string; detalle?: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <p className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
        {principal}
      </p>
      {detalle ? (
        <p className="text-(length:--text-xs) break-words text-(--color-ink-soft)">{detalle}</p>
      ) : null}
    </div>
  )
}

// El acceso que vale: el código, quién lo dio, el último ingreso y si sigue con la clave temporal. Nunca la clave: se vio una vez.
function DetalleDelActivo({ acceso }: { acceso: AccesoVigente }) {
  const { zonaHoraria: zona } = useRegional()
  const ingreso = acceso.ultimoIngresoEn
    ? `entró ${fechaRelativa(acceso.ultimoIngresoEn, { zona })}`
    : 'todavía no entró'
  return (
    <>
      Código <span className={CODIGO}>{acceso.codigo}</span> · lo dio{' '}
      {nombreDeQuien(acceso.otorgadoPor)} · {ingreso}
      {acceso.debeCambiarClave ? ', con la clave temporal' : ''}
    </>
  )
}

// Cómo está el acceso del cliente, en una línea que se entiende de un vistazo y, debajo y más chica, lo que hace falta saber.
export function EstadoDelPortal({ acceso }: { acceso: AccesoDelCliente }) {
  const { zonaHoraria: zona } = useRegional()
  switch (acceso.estado) {
    case 'sin_acceso':
      return <Lineas principal="Sin acceso" />
    case 'activo':
      return (
        <Lineas
          principal={`Tiene acceso desde ${formatearFecha(acceso.otorgadoEn, { zona })}`}
          detalle={<DetalleDelActivo acceso={acceso} />}
        />
      )
    case 'bloqueado':
      return (
        <Lineas
          principal={
            acceso.bloqueadoHasta
              ? `Bloqueado: no puede entrar hasta las ${formatearHora(acceso.bloqueadoHasta, { zona })}.`
              : 'Bloqueado: no puede entrar por ahora.'
          }
          detalle={
            <>
              Código <span className={CODIGO}>{acceso.codigo}</span>. Si ya hablaste con el cliente,
              desbloquéalo.
            </>
          }
        />
      )
    case 'revocado':
      return (
        <Lineas
          principal="Sin acceso"
          detalle={`${
            acceso.revocadoEn
              ? `Lo revocó ${nombreDeQuien(acceso.revocadoPor)} ${fechaRelativa(acceso.revocadoEn, { zona })}. `
              : 'Revocado. '
          }Ese código ya no vale: para darle acceso otra vez, otórgale uno nuevo.`}
        />
      )
  }
}

'use client'

import type { ReactNode } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE,
  LARGO_MAXIMO_DEL_CONTENEDOR,
} from '../../../entities/transporte/transporte'
import { ATRIBUTO_DE_CLAVE_DE_DATO } from '../../../entities/nucleo/paneles-de-la-unidad'
import type { PropsDeCampos } from './campos-de-ruta'

// El envoltorio de un campo que cumple una clave de dato de un requisito: «Completar» de «Qué falta» le lleva el foco. `contents`: no cambia la grilla.
export function CampoDeLaClave({ clave, children }: { clave: string; children: ReactNode }) {
  return (
    <div className="contents" {...{ [ATRIBUTO_DE_CLAVE_DE_DATO]: clave }}>
      {children}
    </div>
  )
}

// «Contenedor y booking»: se escriben como salgan; la base los guarda en mayúsculas y sin espacios (6.08-2).
export function CamposDeContenedor({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
}: PropsDeCampos) {
  return (
    <>
      <CampoDeLaClave clave="transporte.contenedor">
        <Campo
          nombre={`${prefijo}-contenedor`}
          etiqueta="Contenedor"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={LARGO_MAXIMO_DEL_CONTENEDOR * 2}
          value={valores.contenedor}
          onChange={(e) => {
            escribir('contenedor', e.target.value)
          }}
          error={errores.contenedor}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <CampoDeLaClave clave="transporte.booking">
        <Campo
          nombre={`${prefijo}-booking`}
          etiqueta="Booking"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={LARGO_MAXIMO_DEL_CONTENEDOR * 2}
          value={valores.booking}
          onChange={(e) => {
            escribir('booking', e.target.value)
          }}
          error={errores.booking}
          disabled={apagado}
        />
      </CampoDeLaClave>
    </>
  )
}

// «Fechas y notas»: son `date` (sin hora, D18) y viajan `AAAA-MM-DD` tal cual.
export function CamposDeFechasYNotas({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
}: PropsDeCampos) {
  const idDeNotas = `${prefijo}-notas`
  return (
    <>
      <CampoDeLaClave clave="transporte.zarpe">
        <Campo
          nombre={`${prefijo}-zarpe`}
          etiqueta="Zarpe"
          type="date"
          value={valores.zarpe}
          onChange={(e) => {
            escribir('zarpe', e.target.value)
          }}
          error={errores.zarpe}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <CampoDeLaClave clave="transporte.eta">
        <Campo
          nombre={`${prefijo}-eta`}
          etiqueta="ETA"
          type="date"
          value={valores.eta}
          onChange={(e) => {
            escribir('eta', e.target.value)
          }}
          error={errores.eta}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <CampoDeLaClave clave="transporte.arribo">
        <Campo
          nombre={`${prefijo}-arribo`}
          etiqueta="Arribo"
          type="date"
          value={valores.arribo}
          onChange={(e) => {
            escribir('arribo', e.target.value)
          }}
          error={errores.arribo}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <div className="grid gap-1.5">
        <Label htmlFor={idDeNotas}>Notas</Label>
        <Textarea
          id={idDeNotas}
          name={idDeNotas}
          maxLength={LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE}
          value={valores.notas}
          onChange={(e) => {
            escribir('notas', e.target.value)
          }}
          aria-invalid={errores.notas ? true : undefined}
          aria-describedby={errores.notas ? `${idDeNotas}-error` : undefined}
          disabled={apagado}
        />
        {errores.notas ? (
          <p
            id={`${idDeNotas}-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errores.notas}
          </p>
        ) : null}
      </div>
    </>
  )
}

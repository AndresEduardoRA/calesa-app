'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  CARGO_MAX,
  ESPECIALIDADES_MAX,
  HANDLE_MAX,
  PRESENTACION_MAX,
} from '../../../../entities/turnos/ficha'
import type { FichaEnModal } from '../hooks/use-envio-de-ficha'

// Los cinco campos de texto de la ficha, controlados por `useEnvioDeFicha`: lo escrito es del estado, no del DOM.
export function CamposDeFicha({ modal }: { modal: FichaEnModal }) {
  const { escrito, cambiar } = modal
  const errores = modal.formulario.errores
  return (
    <>
      <Campo
        nombre="whatsapp"
        etiqueta="WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+59170000000"
        value={escrito.whatsapp}
        onChange={(evento) => {
          cambiar('whatsapp', evento.target.value)
        }}
        ayuda="Con el código del país, por ejemplo +591…. Lo necesitas para recibir turnos de la web."
        error={errores['whatsapp']}
      />
      <Campo
        nombre="handle"
        etiqueta="Identificador"
        autoComplete="off"
        autoCapitalize="none"
        maxLength={HANDLE_MAX + 10}
        value={escrito.handle}
        onChange={(evento) => {
          cambiar('handle', evento.target.value)
        }}
        ayuda="Es tu dirección en la web: minúsculas, números y . _ -. Nadie más puede tener el mismo."
        error={errores['handle']}
      />
      <Campo
        nombre="cargo"
        etiqueta="Cargo"
        autoComplete="off"
        maxLength={CARGO_MAX + 10}
        value={escrito.cargo}
        onChange={(evento) => {
          cambiar('cargo', evento.target.value)
        }}
        error={errores['cargo']}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="presentacion">Presentación</Label>
        <Textarea
          id="presentacion"
          name="presentacion"
          rows={4}
          maxLength={PRESENTACION_MAX + 50}
          value={escrito.presentacion}
          onChange={(evento) => {
            cambiar('presentacion', evento.target.value)
          }}
          aria-invalid={errores['presentacion'] ? true : undefined}
          aria-describedby={errores['presentacion'] ? 'presentacion-error' : undefined}
        />
        {errores['presentacion'] ? (
          <p id="presentacion-error" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {errores['presentacion']}
          </p>
        ) : null}
      </div>
      <Campo
        nombre="especialidades"
        etiqueta="Especialidades"
        autoComplete="off"
        value={escrito.especialidades}
        onChange={(evento) => {
          cambiar('especialidades', evento.target.value)
        }}
        ayuda={`Separadas por coma, hasta ${String(ESPECIALIDADES_MAX)}.`}
        error={errores['especialidades']}
      />
    </>
  )
}

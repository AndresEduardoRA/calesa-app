'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button, buttonVariants } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { Opciones } from '@/shared/ui/opciones'
import { resumenDePreconfiguracion } from '../../../entities/preconfiguraciones'
import {
  ETIQUETA_DE_TIPO_DE_ORIGEN,
  TIPOS_DE_ORIGEN,
  type TipoDeOrigen,
} from '../../../entities/origen'
import { useAltaDelOrigen } from '../hooks/use-alta-del-origen'
import { CamposDeOrigen } from './campos-de-origen'

const A_LO_ANCHO = 'min-h-11 w-full md:min-h-9 md:w-auto'

// El pie: una sola acción principal, «Crear origen», y «Cancelar», que vuelve a la lista. Con algo escrito, salir pregunta aquí mismo.
function PieDelAlta({ alta }: { alta: ReturnType<typeof useAltaDelOrigen> }) {
  if (alta.salida.pendiente) {
    return <ConfirmarDescarte alSeguir={alta.salida.seguir} alDescartar={alta.salida.descartar} />
  }
  return (
    <div className="flex flex-col gap-2 md:flex-row-reverse md:items-center md:justify-start">
      <Button type="submit" size="lg" disabled={alta.apagado} className={A_LO_ANCHO}>
        {alta.apagado ? 'Creando…' : 'Crear origen'}
      </Button>
      <Link
        href={RUTAS.origenes as Route}
        className={`${buttonVariants({ variant: 'ghost', size: 'lg' })} ${A_LO_ANCHO}`}
      >
        Cancelar
      </Link>
    </div>
  )
}

// El primer paso de la puesta en marcha (`/configuracion/origenes/nuevo`): el tipo decide con qué campos nace; el flujo y los campos los crea la base en
// la misma operación. Al crear lleva al paso Campos; mientras crea, todo queda apagado.
export function FormularioDelOrigenNuevo() {
  const alta = useAltaDelOrigen()
  return (
    <form
      noValidate
      className="grid max-w-2xl min-w-0 gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void alta.crear(evento.currentTarget)
      }}
    >
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        De dónde vienen los vehículos: una subasta, una oficina, un país.
      </p>
      <Opciones<TipoDeOrigen>
        etiqueta="Tipo"
        opciones={TIPOS_DE_ORIGEN.map((valor) => ({
          valor,
          etiqueta: ETIQUETA_DE_TIPO_DE_ORIGEN[valor],
        }))}
        valor={alta.tipo}
        alCambiar={alta.elegirTipo}
        ayuda="No cambia después de crearlo."
        deshabilitado={alta.apagado}
      />
      <Aviso>{resumenDePreconfiguracion(alta.tipo)}</Aviso>
      <CamposDeOrigen
        valores={alta.valores}
        alCambiar={alta.cambiar}
        esDeSubasta={alta.tipo === 'subasta'}
        deshabilitado={alta.apagado}
        errores={alta.errores}
      />
      <div className="border-t border-(--color-line) pt-4">
        <PieDelAlta alta={alta} />
      </div>
    </form>
  )
}

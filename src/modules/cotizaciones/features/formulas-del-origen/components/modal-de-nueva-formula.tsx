'use client'

import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Opciones } from '@/shared/ui/opciones'
import { LARGO_DEL_NOMBRE } from '../../../entities/formula-del-origen'
import { SIN_OTRO_ORIGEN } from '../../../entities/formulas-del-origen/copiar'
import { CAUSA_SIN_TIPOS_DE_CAMBIO } from '../../../entities/formulas-del-origen/resultado'
import type { ComoEmpieza } from '../hooks/use-fuente-de-la-copia'
import { useNuevaFormula } from '../hooks/use-nueva-formula'
import { FuenteDeLaCopia } from './fuente-de-la-copia'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  // Los orígenes de los que se puede copiar (los que la persona configura, sin el abierto).
  origenesParaCopiar: readonly { id: string; nombre: string }[]
  copiaInicial: string | null
  // Lo que propone quien lo abre desde otra pantalla (la puesta en marcha): cómo empieza, el nombre y qué pasa al crear (sin `alCrear`, abre su planilla).
  comoInicial?: ComoEmpieza | null
  nombreInicial?: string
  alCrear?: (id: string) => void
  // El origen todavía no tiene fórmulas: no se ofrece «Copia de este origen».
  sinCopiaDeEste?: boolean
}

const COMO: readonly { valor: ComoEmpieza; etiqueta: string }[] = [
  { valor: 'blanco', etiqueta: 'En blanco' },
  { valor: 'este', etiqueta: 'Copia de este origen' },
  { valor: 'otro', etiqueta: 'Copia de otro origen' },
]

// «Nueva fórmula» (`?panel=nueva-formula`, con `&copia=<id>` desde «Copiar» o `&como=blanco|otro` desde la puesta en marcha): cómo empieza, qué se copia y el
// nombre. Al crear abre su planilla (o lo que diga `alCrear`). Quien lo monta
// le da una `key` por apertura: cada una es un intento nuevo.
export function ModalDeNuevaFormula({
  abierto,
  alCerrar,
  origen,
  origenesParaCopiar,
  copiaInicial,
  comoInicial = null,
  nombreInicial,
  alCrear,
  sinCopiaDeEste = false,
}: Props) {
  const formulario = useNuevaFormula({ origen, copiaInicial, comoInicial, nombreInicial, alCrear })
  const opciones = COMO.filter(
    (c) =>
      !(c.valor === 'otro' && origenesParaCopiar.length === 0) &&
      !(c.valor === 'este' && sinCopiaDeEste),
  )
  const largo = [...formulario.nombre].length
  return (
    <ModalDeFormulario
      id="nueva-formula"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva fórmula"
      descripcion={`Una fórmula más de «${origen.nombre}»: no se cotiza con ella hasta que la actives.`}
      formulario={formulario}
      guardar={{ etiqueta: 'Crear fórmula', enCurso: 'Creando…' }}
    >
      <Opciones
        etiqueta="Cómo empieza"
        opciones={opciones}
        valor={formulario.como}
        alCambiar={formulario.elegirComo}
        ayuda={origenesParaCopiar.length > 0 ? undefined : SIN_OTRO_ORIGEN}
      />
      {formulario.como === 'blanco' ? null : (
        <FuenteDeLaCopia formulario={formulario} origenes={origenesParaCopiar} />
      )}
      <Campo
        nombre="formula-nombre"
        etiqueta="Nombre"
        autoComplete="off"
        required
        maxLength={LARGO_DEL_NOMBRE * 2}
        value={formulario.nombre}
        onChange={(e) => {
          formulario.escribirNombre(e.target.value)
        }}
        ayuda={`${String(largo)} de ${String(LARGO_DEL_NOMBRE)}`}
        error={formulario.errores['nombre']}
      />
      {formulario.rechazo?.causa === CAUSA_SIN_TIPOS_DE_CAMBIO ? (
        <Aviso tono="aviso">
          <Link href={RUTAS.monedasDeEmpresa} className="font-medium underline underline-offset-4">
            Abrir Monedas
          </Link>
        </Aviso>
      ) : null}
    </ModalDeFormulario>
  )
}

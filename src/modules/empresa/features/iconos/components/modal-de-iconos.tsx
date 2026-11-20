'use client'

import { useState } from 'react'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Button } from '@/shared/ui/button'
import { Opciones } from '@/shared/ui/opciones'
import { useApertura } from '@/shared/ui/use-apertura'
import type { FondoDeIcono, Iconos } from '../../../entities/iconos'
import { MOTIVO_SIN_LOGO } from '../../../entities/motivos'
import { useIconos } from '../hooks/use-iconos'
import { VistaPreviaDeIconos } from './vista-previa-de-iconos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // URL pública del logo guardado, o null si la empresa no cargó uno.
  logoUrl: string | null
  colorAcento: string | null
  // Los íconos guardados hoy, o null si valen los neutros.
  iconos: Iconos | null
  // ISO: la versión de los ajustes, que viaja con cada guardado.
  actualizadoEn: string
}

const FONDOS = [
  { valor: 'marca', etiqueta: 'Color de marca' },
  { valor: 'blanco', etiqueta: 'Blanco' },
] as const

// «Íconos de la app» (`?panel=iconos`): el ícono de la pestaña del navegador y el que queda al instalar la app, dibujados desde el logo
// **guardado**. Cada apertura empieza sin nada dibujado.
export function ModalDeIconos(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeIconos key={apertura} {...props} />
}

function FormularioDeIconos(props: Props) {
  const { logoUrl } = props
  const [fondo, setFondo] = useState<FondoDeIcono>('marca')
  const { formulario, dibujados, dibujar, dibujando } = useIconos(props)
  const bloqueado = formulario.enCurso || dibujando
  return (
    <ModalDeFormulario
      id="ajustes-iconos"
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo="Íconos de la app"
      descripcion="El ícono de la pestaña del navegador y el que queda al instalar la app en el celular."
      ancho="amplio"
      formulario={formulario}
      detalleDelConflicto="Recargar trae la versión de ahora y conserva lo que dibujaste."
      guardar={{ etiqueta: 'Guardar íconos', enCurso: 'Guardando…' }}
    >
      <Opciones
        etiqueta="Fondo"
        ayuda="Si el logo es del color de la marca, sobre ese mismo color no se ve: prueba con blanco."
        opciones={FONDOS}
        valor={fondo}
        alCambiar={setFondo}
        deshabilitado={bloqueado || !logoUrl}
      />
      {dibujados ? <VistaPreviaDeIconos dibujados={dibujados} /> : null}
      <div>
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          disabled={bloqueado || !logoUrl}
          onClick={() => void dibujar(fondo)}
        >
          {dibujando ? 'Dibujando…' : dibujados ? 'Volver a dibujar' : 'Dibujar los íconos'}
        </Button>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {logoUrl
          ? 'Donde la app ya está instalada, el ícono cambia recién al reinstalarla; en una pestaña abierta, al vaciar la caché del navegador.'
          : MOTIVO_SIN_LOGO}
      </p>
    </ModalDeFormulario>
  )
}

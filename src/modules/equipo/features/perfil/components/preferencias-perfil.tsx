'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { useDensidad } from '@/shared/ui/densidad'
import { Opciones } from '@/shared/ui/opciones'
import { TAMANOS_DE_PAGINA, TAMANO_DE_PAGINA_POR_DEFECTO } from '@/shared/lib/paginacion'
import { usePorPagina } from '@/shared/ui/por-pagina'
import { avisarError } from '@/shared/ui/toasts'
import { TEMAS } from '../../../entities/preferencias'
import { OPCIONES_DE_DENSIDAD, OPCIONES_TEMA } from '../../../entities/resumen-de-preferencias'

const OPCIONES_POR_PAGINA = TAMANOS_DE_PAGINA.map((tamano) => ({
  valor: String(tamano),
  etiqueta: String(tamano),
}))

const sinSuscripcion = () => () => undefined

// Tema, densidad e ítems por página, dentro del modal «Preferencias». Guardar no hace falta: cada cambio se aplica al instante y lo persiste <ProveedorPreferencias>.
export function ControlesDePreferencias() {
  const { theme, setTheme } = useTheme()
  const { preferencia, cambiar } = useDensidad()
  const porPagina = usePorPagina()
  // El tema vive en el navegador: en el servidor no se sabe cuál es, así que se marca al montar.
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
  const tema = montado ? (TEMAS.find((opcion) => opcion === theme) ?? null) : null

  return (
    <>
      <Opciones etiqueta="Tema" opciones={OPCIONES_TEMA} valor={tema} alCambiar={setTheme} />
      <Opciones
        etiqueta="Densidad"
        ayuda="Automática: compacta con mouse, cómoda en pantallas táctiles."
        opciones={OPCIONES_DE_DENSIDAD}
        valor={preferencia ?? 'automatica'}
        alCambiar={(valor) => {
          cambiar(valor === 'automatica' ? null : valor)
        }}
      />
      <Opciones
        etiqueta="Ítems por página"
        ayuda={`En las listas con páginas (leads y vehículos). Cada lista ofrece hasta su máximo. Sin elegir: ${String(TAMANO_DE_PAGINA_POR_DEFECTO)}.`}
        opciones={OPCIONES_POR_PAGINA}
        valor={porPagina.preferencia === null ? null : String(porPagina.preferencia)}
        alCambiar={(valor) => {
          const tamano = TAMANOS_DE_PAGINA.find((uno) => String(uno) === valor)
          if (tamano === undefined) {
            return
          }
          void porPagina.elegir(tamano).then((resultado) => {
            if (!resultado.ok) {
              avisarError({ codigo: 'inesperado', mensaje: resultado.mensaje })
            }
          })
        }}
      />
    </>
  )
}

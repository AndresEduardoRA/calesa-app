'use client'

import { useId } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { CLAVES_DE_LEGALES, type LegalesDelSitio } from '../../../../entities/contenido/legales'
import { useGuardarLegales } from '../hooks/use-guardar-legales'
import { useValoresDeLegales } from '../hooks/use-valores-de-legales'
import { CAMPO_DE_DOCUMENTO, CAMPO_DE_TITULO } from '../hooks/valores-de-legales'
import { BloqueDeLegal } from './bloque-de-legal'

export type PropsDeLegales = { legales: LegalesDelSitio }

// Configuración › Sitio web › Legales: los términos y la política de privacidad con una sola barra de cambios sin guardar (los dos comparten la versión de
// la fila de ajustes). Quien lo usa le pone de `key` esa versión: lo guardado (aquí o en «Ajustes») lo vuelve a montar desde la base. El borrador guarda
// lo escrito. La barra es hermana del formulario, con `order-last`: queda al final de la página, pegada abajo.
export function FormularioDeLegales({ legales }: PropsDeLegales) {
  const idFormulario = useId()
  const enLinea = useEnLinea()
  const { valores, cambiar, borrador, hayCambios, descartar } = useValoresDeLegales(legales)
  const { guardar, recargar, enCurso, conflicto, errores } = useGuardarLegales({
    actualizadoEn: legales.actualizadoEn,
    valores,
    alGuardar: borrador.limpiar,
  })
  const guardarAhora = () => {
    void guardar()
  }
  useAtajo('guardar', guardarAhora)
  useAtajo('guardarYSeguir', guardarAhora)

  return (
    <>
      <form
        id={idFormulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          guardarAhora()
        }}
      >
        {enLinea ? null : (
          <Aviso tono="aviso">
            No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
          </Aviso>
        )}
        {conflicto ? <AvisoDeConflicto mensaje={conflicto} alRecargar={recargar} /> : null}
        {errores['legales'] ? (
          <Aviso tono="peligro">
            <p>{errores['legales']}</p>
          </Aviso>
        ) : null}
        <fieldset disabled={enCurso} className="grid min-w-0 gap-4">
          <legend className="sr-only">Legales del sitio</legend>
          {CLAVES_DE_LEGALES.map((clave) => (
            <BloqueDeLegal
              key={clave}
              clave={clave}
              titulo={valores[CAMPO_DE_TITULO[clave]]}
              documento={valores[CAMPO_DE_DOCUMENTO[clave]]}
              alCambiar={({ titulo, documento }) => {
                cambiar({
                  ...(titulo === undefined ? {} : { [CAMPO_DE_TITULO[clave]]: titulo }),
                  ...(documento === undefined ? {} : { [CAMPO_DE_DOCUMENTO[clave]]: documento }),
                })
              }}
              errorDelTitulo={errores[`${clave}Titulo`]}
              errorDelTexto={errores[clave]}
              guardadoEn={legales[clave]?.actualizadoEn ?? null}
              deshabilitado={enCurso}
            />
          ))}
        </fieldset>
      </form>
      <BarraDeCambiosSinGuardar
        className="order-last"
        formulario={idFormulario}
        hayCambios={hayCambios}
        guardando={enCurso}
        alDescartar={descartar}
      />
    </>
  )
}

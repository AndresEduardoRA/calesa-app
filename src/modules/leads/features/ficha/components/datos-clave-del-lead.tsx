'use client'

import { useRef } from 'react'
import { valorMostrado } from '@/shared/lib/campos'
import { Button } from '@/shared/ui/button'
import { Dato, ValorMostrado } from '@/shared/ui/campos'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import { useRegional } from '@/shared/ui/regional'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { EdicionDelMenu } from '../../../entities/acciones-de-lead'
import { CLAVE_DE_VER, VER_DATOS } from '../../../entities/bloques-de-la-ficha'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import { campoDeNotas, campoDelPais, datoDelCampo } from '../../../entities/datos-clave-del-lead'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'
import { OrigenDelLead } from '../../listado/components/origen-del-lead'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { ModalDeDatosDelLeadDiferido } from './diferidos'
import { NumeroDeTelefono } from './numero-de-telefono'
import { PaisDelLead } from './pais-del-lead'
import { SoloLaCartera } from './solo-la-cartera'

type Props = {
  ficha: LeadDeFicha
  // Los campos activos del layout (los desactivados no se muestran).
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  // «Editar» o «Editar teléfonos» en «Ver más» (`edicionDelMenu()`); nulo, no se ofrece.
  edicion: EdicionDelMenu | null
}

// Dos columnas en los 24 rem de la columna; una en el celular angosto y con el texto al 200 % (en rem, caen columnas en vez de ensanchar).
const REJILLA = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3'

// «Notas» a lo ancho de las dos columnas, hasta cuatro líneas (el texto entero, en «Ver más»). Sin campo «Notas» no se dibuja.
function NotasDelLead({ ficha, campos }: Pick<Props, 'ficha' | 'campos'>) {
  const { locale, zonaHoraria } = useRegional()
  const dato = datoDelCampo(campoDeNotas(campos), ficha.atributos, ficha.enCartera)
  if (dato.tipo === 'sin_campo') {
    return null
  }
  return (
    <div className="col-span-full grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{dato.campo.etiqueta}</dt>
      <dd className="line-clamp-4 min-w-0 text-(length:--text-sm) break-words whitespace-pre-line text-(--color-ink)">
        {dato.tipo === 'valor' ? (
          <ValorMostrado
            valor={valorMostrado(dato.campo, dato.valor, { locale, zona: zonaHoraria })}
          />
        ) : dato.tipo === 'privado' ? (
          <SoloLaCartera />
        ) : (
          <span className="text-(--color-ink-faint)">Sin notas</span>
        )}
      </dd>
    </div>
  )
}

// «Datos» de la ficha: los datos clave del lead —tipo, origen, país y teléfono principal, y «Notas» a lo ancho— y «Ver más», que abre todo
// lo demás en un modal por la URL (`?ver=datos`). El modal y su código llegan recién al abrirlo: no viajan en el documento.
export function DatosClaveDelLead({ ficha, campos, origen, tipo, edicion }: Props) {
  const ver = usePanelPorUrl(VER_DATOS, [], { clave: CLAVE_DE_VER })
  const panel = usePanelDeLead()
  const montado = useAbiertoAlgunaVez(ver.abierto)
  const verMas = useRef<HTMLButtonElement>(null)
  const pais = datoDelCampo(campoDelPais(campos), ficha.atributos, ficha.enCartera)
  return (
    <section aria-labelledby="datos-de-la-ficha" className="grid min-w-0 gap-3">
      <h2 id="datos-de-la-ficha" className={TITULO_DE_BLOQUE}>
        Datos
      </h2>
      <dl className={REJILLA}>
        <Dato etiqueta="Tipo">
          <BadgeDeTipo tipo={tipo} />
        </Dato>
        <Dato etiqueta="Origen del lead">
          {origen ? (
            <OrigenDelLead nombre={origen.nombre} icono={origen.icono} activo={origen.activo} />
          ) : (
            '—'
          )}
        </Dato>
        <Dato etiqueta="País">
          <PaisDelLead dato={pais} numero={ficha.telefono} />
        </Dato>
        <Dato etiqueta="Teléfono principal">
          <NumeroDeTelefono
            numero={ficha.telefono}
            codigoDePais={ficha.telefonoCc}
            llamable={ficha.enCartera}
            sinPais
          />
          {ficha.enCartera ? null : (
            <span className="block text-(length:--text-xs) text-(--color-ink-soft)">
              Completo solo para su cartera.
            </span>
          )}
        </Dato>
        <NotasDelLead ficha={ficha} campos={campos} />
      </dl>
      <Button
        ref={verMas}
        type="button"
        variant="outline"
        className="h-11 w-full md:h-9"
        aria-haspopup="dialog"
        onClick={() => {
          ver.abrir()
        }}
      >
        Ver más
      </Button>
      {montado ? (
        <ModalDeDatosDelLeadDiferido
          abierto={ver.abierto}
          alCerrar={ver.cerrar}
          ficha={ficha}
          campos={campos}
          edicion={edicion}
          // Uno en lugar del otro, en la misma escritura de la URL: queda `?panel=editar-lead` sin `ver`.
          alEditar={() => {
            ver.cerrar()
            panel.abrir()
          }}
          focoAlCerrar={verMas}
        />
      ) : null}
    </section>
  )
}

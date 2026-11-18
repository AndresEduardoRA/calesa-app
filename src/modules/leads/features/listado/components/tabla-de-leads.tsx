'use client'

import {
  CabeceraPegada,
  CeldaPegada,
  EnlaceDeLaFila,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { tipoDelCatalogo } from '../../../entities/catalogos'
import type { OrigenConEstado } from '../../../entities/ficha'
import { camposDeTabla } from '../../../entities/listado'
import type { FilaDeLead } from '../../../entities/listado'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { MenuDeLaFila } from './menu-de-la-fila'
import { NombreDeFila } from './nombre-de-fila'
import { telefonoDeLista } from './telefono-de-lista'
import { OrigenDelLead } from './origen-del-lead'
import { type DatosDeLaLista, origenDelCatalogo, type ParaMarcar, rutaDeLaFicha } from './tipos'
import {
  RecordatorioDeFila,
  UltimoSeguimientoDeFila,
  useContextoDeUltimoContacto,
  type DatosDeUltimoContacto,
} from './ultimo-contacto'

// El «⋯» de la fila, a la derecha: lo único que se hace desde la fila (crear una oportunidad también).
function AccionesDeLaFila({ lead, marcar }: { lead: FilaDeLead; marcar: ParaMarcar }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <MenuDeLaFila lead={lead} marcar={marcar} />
    </div>
  )
}

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  marcar: ParaMarcar
  ultimoContacto: DatosDeUltimoContacto
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

function OrigenDeLaFila({ origen }: { origen: OrigenConEstado | null }) {
  return origen ? (
    <OrigenDelLead nombre={origen.nombre} icono={origen.icono ?? null} enLista />
  ) : (
    VACIO
  )
}

function EncabezadoDeLaTabla({ columnas }: { columnas: ReturnType<typeof camposDeTabla> }) {
  return (
    <TableHeader>
      <TableRow>
        <CabeceraPegada lado="nombre">Nombre</CabeceraPegada>
        <TableHead>Teléfono</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead>Origen del lead</TableHead>
        <TableHead>Último seguimiento</TableHead>
        <TableHead>Recordatorio</TableHead>
        {columnas.map((campo) => (
          <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
        ))}
        <CabeceraPegada lado="acciones">
          <span className="sr-only">Acciones</span>
        </CabeceraPegada>
      </TableRow>
    </TableHeader>
  )
}

// Los leads en escritorio, con el patrón de lista (`@/shared/ui/lista`): nombre (con las marcas de quien mira), teléfono, tipo y
// origen, el último seguimiento y el próximo recordatorio (`ultimo-contacto.tsx`), una columna por cada campo «en la tabla» del layout y el «⋯». Un clic en cualquier parte de la fila lleva a la ficha
// (el nombre es el enlace: `<EnlaceDeLaFila>`), salvo el del «⋯» y el de un enlace de la fila. La tabla es tan ancha como lo pidan sus columnas (el nombre nunca
// se achica para que quepan) y se desplaza dentro de la tarjeta, con el nombre y el «⋯» a la vista.
export function TablaDeLeads(props: Props) {
  const {
    leads,
    campos,
    origenes,
    tipos,
    codigoDePais,
    etiquetas,
    marcar,
    numeroBuscado,
    ultimoContacto,
  } = props
  const contexto = useContextoDeUltimoContacto(ultimoContacto)
  const columnas = camposDeTabla(campos)
  return (
    <TablaDeLista>
      <EncabezadoDeLaTabla columnas={columnas} />
      <TableBody>
        {leads.map((lead) => (
          <FilaDeLista key={lead.id} idDeVisto={lead.id} href={rutaDeLaFicha(lead.id)}>
            <CeldaPegada lado="nombre">
              <NombreDeFila
                lead={lead}
                etiquetas={etiquetas}
                numeroBuscado={numeroBuscado}
                nombre={(clases) => (
                  <EnlaceDeLaFila
                    href={rutaDeLaFicha(lead.id)}
                    nombre={lead.nombre}
                    className={`max-w-72 ${clases}`}
                  >
                    {lead.nombre}
                  </EnlaceDeLaFila>
                )}
              />
            </CeldaPegada>
            <TableCell className="whitespace-nowrap tabular-nums">
              {telefonoDeLista(lead.telefono, codigoDePais)}
            </TableCell>
            <TableCell>
              <BadgeDeTipo tipo={tipoDelCatalogo(tipos, lead.tipoLeadId)} enLista />
            </TableCell>
            <TableCell className="max-w-48 truncate">
              <OrigenDeLaFila origen={origenDelCatalogo(origenes, lead.origenId)} />
            </TableCell>
            <TableCell className="max-w-56">
              <UltimoSeguimientoDeFila lead={lead} contexto={contexto} />
            </TableCell>
            <TableCell className="max-w-48">
              <RecordatorioDeFila lead={lead} contexto={contexto} />
            </TableCell>
            {columnas.map((campo) => (
              <TableCell key={campo.clave} className="max-w-48 truncate">
                <CeldaDeCampo campo={campo} fila={lead} />
              </TableCell>
            ))}
            <CeldaPegada lado="acciones">
              <AccionesDeLaFila lead={lead} marcar={marcar} />
            </CeldaPegada>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

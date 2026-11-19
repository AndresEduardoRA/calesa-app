import { leerPublicadasPorOrigen, TOPE_DE_ORIGENES_DEL_INICIO } from '@/modules/cotizaciones'
import { getAjustes } from '@/modules/empresa'
import { puede } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { cortarAlTope, textoDelTope } from '@/shared/lib/conteo'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { pestanasGenerales } from './general/abrir'
import { TarjetaDeOrigen } from './tarjeta-de-origen'
import { TarjetaGeneral } from './tarjeta-general'

// Las tarjetas del inicio: una por origen donde la persona tiene `cotizaciones.configurar` (también los inactivos, en el orden del catálogo,
// hasta `TOPE_DE_ORIGENES_DEL_INICIO`), con lo publicado de cada uno, y la «General». Lee la tabla de orígenes (`getOrigenes(true)`, una vez
// por request) y lo publicado por origen (dos consultas por los índices únicos parciales): nada crece con las cotizaciones. Una lectura que
// falla sube al `error.tsx` con «Reintentar».
export async function TarjetasDelInicio({ permisos }: { permisos: Permisos }) {
  const configura = puede(permisos, 'cotizaciones.configurar')
  const suyos = configura
    ? datosO(await getOrigenes(true)).filter((origen) =>
        puede(permisos, 'cotizaciones.configurar', origen.id),
      )
    : []
  const { filas: origenes, hayMas } = cortarAlTope(suyos, TOPE_DE_ORIGENES_DEL_INICIO)
  const [publicadas, { locale }] = await Promise.all([
    leerPublicadasPorOrigen(origenes.map((origen) => origen.id)),
    getAjustes(),
  ])
  const porOrigen = datosO(publicadas)
  return (
    <div className="@container grid gap-3">
      {origenes.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No configuras ningún origen.
        </p>
      ) : null}
      <ul
        aria-label="Tarjetas de Cotización"
        className="grid grid-cols-[minmax(0,1fr)] gap-3 @min-[48rem]:grid-cols-2"
      >
        {origenes.map((origen) => (
          <TarjetaDeOrigen
            key={origen.id}
            origen={origen}
            publicado={
              porOrigen.get(origen.id) ?? { versionDeLaFormula: null, tarjetaPublicada: false }
            }
            locale={locale}
          />
        ))}
        <TarjetaGeneral pestanas={pestanasGenerales(permisos)} />
      </ul>
      {hayMas ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_ORIGENES_DEL_INICIO, { orden: 'primeros' })} />
      ) : null}
    </div>
  )
}

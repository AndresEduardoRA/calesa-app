import { cn } from 'cn'
import Image from 'next/image'
import { formatearNumero } from '@/shared/lib/formato'
import { MuestraDeColor, type FilaDeValores } from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_MONEDA_BASE_CON_DATOS } from '../../../entities/motivos'

const dias = (n: number) => `${String(n)} ${n === 1 ? 'día' : 'días'}`

// El logo guardado en una caja de alto fijo; el del tema oscuro, sobre el fondo oscuro (`dark` resuelve ahí los tokens de ese tema).
function LogoEnCaja({ url, alt, oscuro }: { url: string | null; alt: string; oscuro?: boolean }) {
  return (
    <span
      className={cn(
        oscuro && 'dark',
        'inline-flex h-12 max-w-full min-w-24 items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) px-2 text-(length:--text-xs) text-(--color-ink-faint)',
      )}
    >
      {url ? (
        // Un objeto de Storage: no hay nada que optimizar.
        <Image
          src={url}
          alt={alt}
          width={96}
          height={48}
          unoptimized
          className="h-12 w-auto max-w-full object-contain"
        />
      ) : (
        'Sin logo'
      )}
    </span>
  )
}

export function filasDeIdentidad(
  ajustes: AjustesEmpresa,
  logoUrl: string | null,
  logoOscuroUrl: string | null,
): FilaDeValores[] {
  return [
    { etiqueta: 'Nombre', valor: ajustes.nombre },
    {
      etiqueta: 'Color de la marca',
      valor: ajustes.colorAcento ? <MuestraDeColor color={ajustes.colorAcento} /> : 'Neutro',
    },
    { etiqueta: 'Logo', valor: <LogoEnCaja url={logoUrl} alt="Logo de la empresa" /> },
    {
      etiqueta: 'Logo oscuro',
      valor: <LogoEnCaja url={logoOscuroUrl} alt="Logo de la empresa para el tema oscuro" oscuro />,
    },
  ]
}

export function filasDeRegion(ajustes: AjustesEmpresa, conDatosCargados: boolean): FilaDeValores[] {
  return [
    { etiqueta: 'País', valor: ajustes.pais },
    {
      etiqueta: 'Formato regional',
      valor: ajustes.locale,
      nota: `Así se ve: ${formatearNumero(1234567.89, { locale: ajustes.locale })}`,
    },
    { etiqueta: 'Código de país de los teléfonos', valor: ajustes.telefonoCc },
    { etiqueta: 'Zona horaria', valor: ajustes.zonaHoraria },
    {
      etiqueta: 'Moneda base',
      valor: ajustes.monedaBase,
      nota: conDatosCargados ? MOTIVO_MONEDA_BASE_CON_DATOS : undefined,
    },
  ]
}

export function filasDeDatosLegales(ajustes: AjustesEmpresa): FilaDeValores[] {
  return [
    { etiqueta: 'Razón social', valor: ajustes.razonSocial },
    { etiqueta: 'NIT', valor: ajustes.nit },
    { etiqueta: 'Dirección', valor: ajustes.direccion },
    { etiqueta: 'Ciudad', valor: ajustes.ciudad },
    { etiqueta: 'Teléfono', valor: ajustes.telefono },
    { etiqueta: 'WhatsApp', valor: ajustes.whatsapp },
    { etiqueta: 'Correo', valor: ajustes.email },
  ]
}

export function filasDePoliticas(ajustes: AjustesEmpresa): FilaDeValores[] {
  return [
    { etiqueta: 'Registro', valor: ajustes.registroAbierto ? 'Abierto' : 'Cerrado' },
    { etiqueta: 'Retención de la papelera', valor: dias(ajustes.papeleraDias) },
    { etiqueta: 'Retención de la actividad', valor: dias(ajustes.actividadDias) },
    {
      etiqueta: 'Limpieza de subastas',
      valor: ajustes.limpiezaAutomatica
        ? `Encendida · ${dias(ajustes.limpiezaDiasGracia)} de gracia`
        : 'Apagada',
    },
  ]
}

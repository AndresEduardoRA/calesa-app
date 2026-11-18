import {
  CarIcon,
  CircleDotIcon,
  CreditCardIcon,
  FileTextIcon,
  type LucideIcon,
  PackageIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShipIcon,
  SigmaIcon,
  StampIcon,
  UserIcon,
  WalletIcon,
} from 'lucide-react'
import type { IconoDeEntidad as Clave } from '../../../entities/registro'

const ICONOS: Readonly<Record<Clave, LucideIcon>> = {
  lead: UserIcon,
  vehiculo: CarIcon,
  cotizacion: ScrollTextIcon,
  comprobante: ReceiptIcon,
  aduana: StampIcon,
  documento: FileTextIcon,
  gasto: WalletIcon,
  pago: CreditCardIcon,
  transporte: ShipIcon,
  repuestos: PackageIcon,
  formula: SigmaIcon,
  configuracion: SettingsIcon,
  otro: CircleDotIcon,
}

// El tipo de registro de un cambio, de un vistazo. Decorativo: la frase ya lo nombra.
export function IconoDeEntidad({ icono }: { icono: Clave }) {
  const Icono = ICONOS[icono]
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-(--color-surface-2) text-(--color-ink-soft)"
    >
      <Icono className="size-4" />
    </span>
  )
}

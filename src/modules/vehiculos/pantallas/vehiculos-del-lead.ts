// Pantalla: lo que la ficha de un lead (`/leads/[id]`) dibuja de «Vehículos» al pie de Relacionados (la compone `app/`: `leads` no importa `vehiculos`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { GestionDeVehiculosDelLead } from '../features/vinculo/components/gestion-de-vehiculos-del-lead'

import { admin } from './base'

// A una persona que ya existe, uno de los roles de la semilla (`asesor`, `logistica`, `repuestos`) en vez de uno de prueba: lo que ese rol tiene hoy, sin armarlo.
export async function darRolDeLaSemilla(email: string, clave: string): Promise<void> {
  const cliente = admin()
  const { data: perfil, error: errorDePerfil } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  const { data: rol, error: errorDeRol } = await cliente
    .from('roles')
    .select('id')
    .eq('clave', clave)
    .single<{ id: string }>()
  if (errorDePerfil || errorDeRol) {
    throw new Error(
      `No se pudo leer a ${email} o al rol ${clave}: ${(errorDePerfil ?? errorDeRol)?.message ?? ''}`,
    )
  }
  const { error } = await cliente
    .from('usuarios_roles')
    .insert({ usuario_id: perfil.id, rol_id: rol.id, es_principal: true })
  if (error) {
    throw new Error(`No se pudo darle el rol ${clave} a ${email}: ${error.message}`)
  }
}

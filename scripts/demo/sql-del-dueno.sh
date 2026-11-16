#!/usr/bin/env bash
# Escribe en stdout el SQL que deja al dueño listo para entrar en una base recién reseteada: la cuenta de Auth con su clave y el
# correo confirmado, su perfil y el rol dueño. Lo usa `scripts/demo/resetear.sh` tras el reset; se prueba en `sql-del-dueno.test.ts`.
#
#   DEMO_DUENO_EMAIL=… DEMO_DUENO_CLAVE=… [DEMO_DUENO_NOMBRE=…] bash scripts/demo/sql-del-dueno.sh > dueno.sql
#
# Va por SQL (`supabase db query --linked`) y no por la API de admin de Auth: así no pide la secret key. La cuenta nace dueña por el
# trigger `auth_crear_perfil()` (la primera cuenta). Si la cuenta ya estaba (un reset que no vació `auth`), le pone la clave y, si le
# falta, el perfil; si otra cuenta es dueña, el SQL falla con un mensaje que lo dice. Correrlo dos veces deja lo mismo.
# Las credenciales viven en `.env.demo` (ignorado por git; docs/ENTORNOS.md): nunca en el repo, que es público.
set -euo pipefail

falta() { echo "✗ $1" >&2; exit 64; }
EMAIL=$(printf '%s' "${DEMO_DUENO_EMAIL:-}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
CLAVE="${DEMO_DUENO_CLAVE:-}"
NOMBRE="${DEMO_DUENO_NOMBRE:-Dueño de la demo}"
[ -n "$EMAIL" ] || falta "falta DEMO_DUENO_EMAIL (en .env.demo)."
[[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || falta "DEMO_DUENO_EMAIL no tiene forma de correo."
[ "${#CLAVE}" -ge 12 ] || falta "DEMO_DUENO_CLAVE tiene que tener 12 caracteres o más (en .env.demo)."

# Un literal de SQL: comillas simples duplicadas. Sin barras invertidas especiales (standard_conforming_strings = on).
literal() { printf "'%s'" "${1//\'/\'\'}"; }

cat <<SQL
do \$\$
declare
  v_email text := $(literal "$EMAIL");
  v_clave text := $(literal "$CLAVE");
  v_nombre text := $(literal "$NOMBRE");
  v_id uuid;
  v_rol uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = v_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_clave, extensions.gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('nombre', v_nombre), now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users
    set encrypted_password = extensions.crypt(v_clave, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, deleted_at = null, updated_at = now()
    where id = v_id;
  end if;

  -- Un reset que no vació auth deja la cuenta sin perfil: se arma como lo haría el trigger con la primera cuenta.
  if not exists (select 1 from public.perfiles p where p.id = v_id) then
    if exists (select 1 from public.perfiles) then
      raise exception 'Otra cuenta nació antes que % y es la dueña: resetea la base otra vez.', v_email;
    end if;
    insert into public.perfiles (id, nombre, email) values (v_id, v_nombre, v_email);
    select r.id into v_rol from public.roles r where r.clave = 'dueno';
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  end if;

  if not exists (
    select 1 from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
    where ur.usuario_id = v_id and r.clave = 'dueno'
  ) then
    raise exception '% no quedó como dueña: otra cuenta lo es. Resetea la base otra vez.', v_email;
  end if;
end \$\$;
SQL

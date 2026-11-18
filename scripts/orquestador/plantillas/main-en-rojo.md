---
# Dejar verde el e2e de main antes de cerrar la tanda: lo crea solo el orquestador (main_en_rojo en cierre-main.sh) cuando la
# verificación de main que precede al cierre de la tanda cae, una vez por sha. Reemplaza las llaves SHA, SHA_CORTO, CORRIDA (su
# enlace), ID_CORRIDA y CAIDOS (los `caidos.txt` de los artefactos o, si no hay, los jobs caídos; de varias líneas: en estos
# comentarios van sin llaves). Va urgente (cola:urgente).
# `cierre: verificar`: no cuenta como tarea de la tanda. Al integrarse, main cambia de sha y el orquestador vuelve a verificarlo.
titulo: dejar verde el e2e de main ({{SHA_CORTO}}) antes de cerrar la tanda
rama: fix/main-en-rojo-{{SHA_CORTO}}
conflicto: e2e
nivel: normal
effort: high
cierre: verificar
urgente: si
---

## Pedido de la persona

«Antes de cerrar la tanda, main en verde de punta a punta.» El e2e de escritorio sobre `main` cayó en `{{SHA}}`: {{CORRIDA}}. Esta
tarea la abrió solo el orquestador (`scripts/orquestador/README.md` › «El cierre de la tanda»); el cierre espera a que se integre.

## Objetivo

Dejar verdes estos del e2e de escritorio sobre `main`:

{{CAIDOS}}

## Decisiones ya tomadas

- La causa, con evidencia: los artefactos de la corrida (`gh run download {{ID_CORRIDA}}`; en `e2e-fallos/<fecha>/`, la traza, el video y
  `caidos.txt`). Ni reintentar hasta que pase, ni `.skip` ni `.fixme`.
- Si el mismo spec ya está en un issue `noche-roja` en la cola, es la misma falla: dilo en el PR y arréglala aquí.
- Si la causa es ajena al repo (el runner, un servicio de afuera), `RESULTADO: TRABADA —` con la evidencia.

## Anclajes

Los specs de arriba y `e2e/soporte/`.

## Estados no felices

Una prueba que cae sólo en CI se reproduce con el build de producción (`pnpm test:e2e`, como en CI) antes de tocarla · un caído que en
local pasa siempre → la traza de la corrida manda; si no alcanza, trabada con lo visto.

## Verificación

`pnpm test:e2e <los specs caídos> --project=escritorio` en verde, y lo de siempre (`pnpm lint`, `pnpm typecheck`, `pnpm test`).

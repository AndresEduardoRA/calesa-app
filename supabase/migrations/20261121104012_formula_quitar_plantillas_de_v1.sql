-- Las plantillas de V1 («Empezar desde una plantilla») ya no existen: para empezar está «+ Nueva fórmula». Se van la invocadora que las aplicaba y su
-- ayudante del catálogo de colores. Las fórmulas, las tarjetas y los colores que se crearon con ellas se quedan.
drop function public.cotizacion_paquete_aplicar(uuid, jsonb, timestamptz, timestamptz, uuid);
drop function public._paquete_colores_preparar(jsonb, integer);

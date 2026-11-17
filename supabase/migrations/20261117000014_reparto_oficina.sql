-- «Mi reparto» para la oficina: el administrador ve también las rutas de los repartidores
-- (para controlarlas y marcar «Entregado» si al repartidor se le olvida). registrar_entrega
-- ya lo permitía a la oficina. Cada ruta lleva el nombre de su conductor.
create or replace function mi_reparto() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(ruta order by ruta ->> 'fecha', ruta ->> 'creado_at'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id,
      'fecha', r.fecha,
      'estado', r.estado,
      'notas', r.notas,
      'creado_at', r.creado_at,
      'conductor', (select pf.nombre from perfiles pf where pf.id = r.conductor_id),
      'es_mia', r.conductor_id = auth.uid(),
      'vehiculo', (select jsonb_build_object('nombre', v.nombre, 'matricula', v.matricula) from vehiculos v where v.id = r.vehiculo_id),
      'almacen', (select jsonb_build_object('direccion', a.almacen_direccion, 'lat', a.almacen_lat, 'lng', a.almacen_lng) from ajustes_logistica a),
      'paradas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'orden', p.orden,
          'estado', p.estado,
          'entrega_id', p.entrega_id,
          'realizada_at', p.realizada_at,
          'notas_oficina', p.notas_oficina,
          'pedido_id', p.pedido_id,
          'llegada_prevista', to_char(p.llegada_prevista, 'HH24:MI'),
          'albaran', al.numero,
          'cliente', case when c.id is not null then jsonb_build_object(
              'id', c.id, 'nombre', c.nombre_negocio, 'direccion', c.direccion, 'localidad', c.localidad,
              'telefono', c.telefono, 'contacto', c.contacto_nombre, 'lat', c.lat, 'lng', c.lng,
              'horario_entrega', ce.horario_entrega, 'notas_acceso', ce.notas_acceso)
            else jsonb_build_object(
              'id', d.id, 'nombre', d.nombre, 'direccion', d.direccion, 'localidad', d.localidad,
              'telefono', d.telefono, 'contacto', null, 'lat', d.lat, 'lng', d.lng,
              'horario_entrega', coalesce(d.horario_texto,
                case when d.ventana_desde is not null or d.ventana_hasta is not null
                  then concat_ws('-', to_char(d.ventana_desde, 'HH24:MI'), to_char(d.ventana_hasta, 'HH24:MI')) end),
              'notas_acceso', d.notas_acceso) end,
          'lineas', case
            when p.pedido_id is not null then coalesce((
              select jsonb_agg(jsonb_build_object('producto_id', l.producto_id, 'descripcion', l.descripcion, 'cantidad', l.cantidad) order by l.descripcion)
              from pedido_lineas l where l.pedido_id = p.pedido_id), '[]'::jsonb)
            when al.id is not null then coalesce((
              select jsonb_agg(jsonb_build_object('producto_id', null, 'descripcion', x ->> 'descripcion', 'cantidad', coalesce((x ->> 'cantidad')::numeric, 1)))
              from jsonb_array_elements(al.lineas) x), '[]'::jsonb)
            else '[]'::jsonb end
        ) order by p.orden)
        from paradas p
        left join clientes c on c.id = p.cliente_id
        left join clientes_entrega ce on ce.cliente_id = c.id
        left join destinos d on d.id = p.destino_id
        left join albaranes al on al.id = p.albaran_id
        where p.ruta_id = r.id), '[]'::jsonb)
    ) as ruta
    from rutas r
    where (r.conductor_id = auth.uid() or es_admin())
      and r.fecha between hoy_madrid() - 7 and hoy_madrid() + 1
      and (r.fecha >= hoy_madrid() - 1 or r.estado <> 'terminada')
  ) t;
$$;

notify pgrst, 'reload schema';

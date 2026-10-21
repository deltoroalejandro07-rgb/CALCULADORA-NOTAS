-- Borra SOLO los datos de ejemplo (is_seed = true). Los datos reales no se tocan.
-- Las visitas, mensajes y pedidos de los clientes demo se borran en cascada.
begin;
delete from mensajes   where is_seed;
delete from campanas   where is_seed;
delete from pedidos    where is_seed;
delete from visitas    where is_seed;
delete from clientes   where is_seed;
delete from ofertas    where is_seed;
delete from plantillas where is_seed;
-- Productos demo que no se usen en pedidos reales
delete from productos p where p.is_seed
  and not exists (select 1 from pedido_lineas l where l.producto_id = p.id);
commit;

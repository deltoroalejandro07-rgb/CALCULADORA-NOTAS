-- =====================================================================
-- Cada comercial envía las campañas a sus propios clientes desde su móvil
-- (enlaces wa.me / mailto), así que también puede crear campañas.
-- =====================================================================

drop policy if exists campanas_ver on campanas;

create policy campanas_ver on campanas for select to authenticated
  using (es_admin() or creado_por = auth.uid()
         or exists (select 1 from mensajes m where m.campana_id = campanas.id and m.comercial_id = auth.uid()));

create policy campanas_crear on campanas for insert to authenticated
  with check (creado_por = auth.uid());

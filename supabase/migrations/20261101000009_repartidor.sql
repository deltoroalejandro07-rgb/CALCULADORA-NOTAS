-- Rol «repartidor»: solo usa Mi reparto (ve sus rutas). No ve clientes del CRM porque no tiene
-- ninguno asignado; los permisos existentes ya lo cubren.
alter type rol_usuario add value if not exists 'repartidor';

notify pgrst, 'reload schema';

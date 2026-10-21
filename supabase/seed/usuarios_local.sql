-- =====================================================================
-- SOLO DESARROLLO LOCAL: usuarios de prueba.
-- En producción los usuarios se invitan desde la app (Ajustes → Usuarios).
-- Entrar con el email; el código llega a Mailpit: http://127.0.0.1:54324
-- =====================================================================

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@demo.local', '', now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Dirección (demo)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'ana@demo.local', '', now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Ana (demo)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'luis@demo.local', '', now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Luis (demo)"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.email like '%@demo.local';

update perfiles set rol = 'admin' where email = 'admin@demo.local';

INSERT INTO app_users (id, username, email, password_hash, created_at)
VALUES
	('077d8081-93b0-4c2f-aa6c-5ce056353517', 'alice', NULL, '$argon2id$v=19$m=65536,t=3,p=4$LKUUovR+DwHgvPfe+9+bcw$tIIzXlKNjkorSoQ1h+KDOw9LBt7oJ66fBftzZPqjYOg', '2026-03-26 16:43:53.330306+00'),
	('7aa64be5-1d72-44ea-9459-5a85918ce497', 'test6666', NULL, '$argon2id$v=19$m=65536,t=3,p=4$VSolBMAY47y3Nmastfaekw$YA6c1GOjrVCB0yEqatJWEBtNx0DfyvlMNDVw09hG3aA', '2026-04-03 20:29:49.353142+00'),
	('8d6aa2e9-5c8f-4683-928f-f22484872630', 'rw4321', NULL, '$argon2id$v=19$m=65536,t=3,p=4$aw1B6L13rnWuVYpRSsk5Jw$0gNFgdnc71+Tj2r7qwSTD8puJpnxU+V/sPUvdR1f6Y0', '2026-04-03 06:21:08.751347+00'),
	('93663401-9781-46a6-a999-010fa7a31acc', 'test', NULL, '$argon2id$v=19$m=65536,t=3,p=4$712rdU6JsZZybi1FqFXKWQ$bjXdm1L6wzR6sqXk/PZU0uCbkxqP0t5UObL7ees12Vk', '2026-03-26 16:43:27.061986+00'),
	('b54c5fe7-ba13-4851-aaf2-15d5e1b1b671', 'test5555', NULL, '$argon2id$v=19$m=65536,t=3,p=4$JeS8t9Y6h5ByrnWOEQLAuA$hhbJrFvkHtsyl6ssi5hroBhQ2qDwq8alAbBD7hvuIHs', '2026-04-03 20:26:49.747959+00'),
	('c1818304-e094-443a-843a-6ac0d9e549f3', 'rw476', NULL, '$argon2id$v=19$m=65536,t=3,p=4$xHivVQrBmHPOmVPq/X8vpQ$EMLzg42fMzd0zK2jcRRQXru19+sP4+FZp+q9BXJ1y14', '2026-04-03 20:19:28.966925+00'),
	('d31a86b6-b8e7-42e5-bb77-a1f7b0cb851d', 'test222', NULL, '$argon2id$v=19$m=65536,t=3,p=4$Qcg5J4TwPqc0JqSUklLKmQ$4tiL2BHZ+KFN6ebkmMWQw1pJiJjwdj/mFGi7hH4iNzE', '2026-04-03 20:20:37.541288+00'),
	('dfdae695-db66-44d7-accf-64f89742dc1e', 'test4444', NULL, '$argon2id$v=19$m=65536,t=3,p=4$MibkHMP4P0dozRnDmHPO2Q$dKlVk73TylnGNNNyZoz3778XZeZmJHz7yzd4M2D/aZs', '2026-04-03 20:23:59.575496+00')
ON CONFLICT (username) DO UPDATE
SET
	id = EXCLUDED.id,
	email = EXCLUDED.email,
	password_hash = EXCLUDED.password_hash,
	created_at = EXCLUDED.created_at;

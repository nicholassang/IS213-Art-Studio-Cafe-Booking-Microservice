INSERT INTO food_orders (order_id, menu_item_id, name, price, quantity, image_url, comment, total, status, created_at)
OVERRIDING SYSTEM VALUE
VALUES
	(47, 1, 'Avocado Toast', 12.00, 2, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/avocado_toast.jpg', 'booking:art-jamming:2026-03-30T00:00:00.000Z', 24.00, 'pending', '2026-04-04 09:36:02.368541'),
	(48, 1, 'Avocado Toast', 12.00, 1, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/avocado_toast.jpg', 'booking:art-jamming:2026-04-11T10:00:00.000Z', 12.00, 'pending', '2026-04-04 09:37:15.639632'),
	(49, 1, 'Avocado Toast', 12.00, 1, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/avocado_toast.jpg', 'booking:art-jamming:2026-04-12T10:00:00.000Z', 12.00, 'pending', '2026-04-04 09:38:55.351388'),
	(50, 2, 'Beef Lasagne', 16.00, 1, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/beef_lasagne.jpg', 'booking:art-jamming:2026-03-30T00:00:00.000Z', 16.00, 'pending', '2026-04-04 09:41:38.851295'),
	(51, 3, 'Truffle Pasta', 18.00, 1, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/truffle_pasta.jpg', 'booking:art-jamming:2026-03-30T00:00:00.000Z', 18.00, 'pending', '2026-04-04 09:41:39.153723')
ON CONFLICT (order_id) DO UPDATE
SET
	menu_item_id = EXCLUDED.menu_item_id,
	name = EXCLUDED.name,
	price = EXCLUDED.price,
	quantity = EXCLUDED.quantity,
	image_url = EXCLUDED.image_url,
	comment = EXCLUDED.comment,
	total = EXCLUDED.total,
	status = EXCLUDED.status,
	created_at = EXCLUDED.created_at;

SELECT setval(
	pg_get_serial_sequence('food_orders', 'order_id'),
	COALESCE((SELECT MAX(order_id) FROM food_orders), 1),
	true
);

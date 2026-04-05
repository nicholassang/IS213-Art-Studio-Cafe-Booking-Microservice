INSERT INTO food_orders (order_id, menu_item_id, name, price, quantity, image_url, comment, total, status, created_at)
OVERRIDING SYSTEM VALUE

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

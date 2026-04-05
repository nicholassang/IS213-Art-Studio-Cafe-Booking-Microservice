INSERT INTO menu_items (id, name, category, description, price, image_url)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Avocado Toast', 'Main Meal', 'Toasted sourdough with smashed avocado and poached egg', 12.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/avocado_toast.jpg'),
  (2, 'Beef Lasagne', 'Main Meal', 'Slow cooked beef lasagne with rich tomato sauce', 16.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/beef_lasagne.jpg'),
  (3, 'Truffle Pasta', 'Main Meal', 'Fettuccine with truffle oil, mushrooms and parmesan', 18.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/truffle_pasta.jpg'),
  (4, 'Caesar Salad', 'Main Meal', 'Crispy romaine with caesar dressing, croutons and parmesan', 12.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/caesar_salad.jpg'),
  (5, 'Chocolate Lava Cake', 'Dessert', 'Warm chocolate cake with molten center', 8.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/chocolate_lava%20_cake.jpg'),
  (6, 'Tiramisu', 'Cake', 'Classic Italian dessert with mascarpone and espresso', 7.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/tiramisu.jpg'),
  (7, 'Red Velvet Cake', 'Cake', 'Moist red velvet with cream cheese frosting', 7.5, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/red_velvet_cake.jpg'),
  (8, 'Croissant', 'Cake', 'Buttery flaky French pastry baked fresh daily', 4.5, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/croissant.jpg'),
  (9, 'Iced Latte', 'Drink', 'Chilled espresso with milk over ice', 5.5, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/iced_latte.jpg'),
  (10, 'Mango Smoothie', 'Drink', 'Fresh blended mango with yogurt and honey', 6.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/mango_smoothie.jpg'),
  (11, 'Strawberry Lemonade', 'Drink', 'Fresh squeezed lemonade with strawberry puree', 5.5, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/strawberry_lemonade.jpg'),
  (12, 'Hot Chocolate', 'Drink', 'Rich Belgian chocolate with steamed milk and marshmallows', 5.0, 'https://blgtzrznellrbuptcogs.supabase.co/storage/v1/object/public/menu-image/hot_chocolate.jpg')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url;

SELECT setval(
  pg_get_serial_sequence('menu_items', 'id'),
  COALESCE((SELECT MAX(id) FROM menu_items), 1),
  true
);

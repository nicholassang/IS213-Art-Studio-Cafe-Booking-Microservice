CREATE TABLE IF NOT EXISTS food_orders (
  order_id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  menu_item_id integer NOT NULL,
  name varchar NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  image_url text,
  comment text DEFAULT '',
  total numeric NOT NULL,
  status varchar DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_orders_pending_lookup
  ON food_orders (menu_item_id, comment, status);

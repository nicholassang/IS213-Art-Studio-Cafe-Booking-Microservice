CREATE TABLE IF NOT EXISTS menu_items (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name varchar NOT NULL,
  category varchar NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text
);

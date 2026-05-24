-- Sample data for the analytics dataset.
-- setseed() makes the random generation below reproducible across rebuilds.
SELECT setseed(0.42);

-- 18 customers across 6 countries (ids 1..18).
INSERT INTO customers (name, email, country, signup_date) VALUES
  ('Alice Johnson',  'alice.johnson@example.com',  'United States',  '2023-01-15'),
  ('Bob Smith',      'bob.smith@example.com',      'United States',  '2023-03-22'),
  ('Carlos Rivera',  'carlos.rivera@example.com',  'United States',  '2023-06-30'),
  ('Emma Brown',     'emma.brown@example.com',     'United Kingdom', '2023-02-10'),
  ('Oliver Wilson',  'oliver.wilson@example.com',  'United Kingdom', '2023-05-18'),
  ('Sophie Taylor',  'sophie.taylor@example.com',  'United Kingdom', '2023-08-05'),
  ('Lukas Mueller',  'lukas.mueller@example.com',  'Germany',        '2023-01-28'),
  ('Hannah Schmidt', 'hannah.schmidt@example.com', 'Germany',        '2023-04-12'),
  ('Felix Wagner',   'felix.wagner@example.com',   'Germany',        '2023-09-09'),
  ('Liam Tremblay',  'liam.tremblay@example.com',  'Canada',         '2023-03-03'),
  ('Olivia Roy',     'olivia.roy@example.com',     'Canada',         '2023-07-21'),
  ('Noah Gagnon',    'noah.gagnon@example.com',    'Canada',         '2023-10-14'),
  ('Charlotte Lee',  'charlotte.lee@example.com',  'Australia',      '2023-02-26'),
  ('Jack Williams',  'jack.williams@example.com',  'Australia',      '2023-06-11'),
  ('Mia Jones',      'mia.jones@example.com',      'Australia',      '2023-11-02'),
  ('Louis Martin',   'louis.martin@example.com',   'France',         '2023-04-19'),
  ('Lea Bernard',    'lea.bernard@example.com',    'France',         '2023-08-27'),
  ('Hugo Dubois',    'hugo.dubois@example.com',    'France',         '2023-12-01');

-- 20 products across 5 categories (ids 1..20).
INSERT INTO products (name, category, price) VALUES
  ('Wireless Headphones',    'Electronics',     79.99),
  ('Bluetooth Speaker',      'Electronics',     49.99),
  ('USB-C Charger',          'Electronics',     24.99),
  ('4K Webcam',              'Electronics',    119.99),
  ('Mechanical Keyboard',    'Electronics',     89.99),
  ('The Pragmatic Programmer','Books',          39.95),
  ('Clean Code',             'Books',           34.50),
  ('Sapiens',                'Books',           22.00),
  ('Atomic Habits',          'Books',           18.99),
  ('Cotton T-Shirt',         'Clothing',        14.99),
  ('Denim Jeans',            'Clothing',        59.99),
  ('Running Jacket',         'Clothing',        89.00),
  ('Wool Sweater',           'Clothing',        64.99),
  ('Stainless Cookware Set', 'Home & Kitchen', 149.99),
  ('Ceramic Mug Set',        'Home & Kitchen',  29.99),
  ('Espresso Machine',       'Home & Kitchen', 199.99),
  ('Knife Block Set',        'Home & Kitchen',  79.99),
  ('Yoga Mat',               'Sports',          25.99),
  ('Dumbbell Set',           'Sports',          99.99),
  ('Insulated Water Bottle', 'Sports',          19.99);

-- 300 orders spread across 2024, random customer and status
-- (status weighted toward 'completed').
INSERT INTO orders (customer_id, order_date, status)
SELECT
  1 + floor(random() * 18)::int,
  DATE '2024-01-01' + (floor(random() * 365))::int,
  (ARRAY['completed', 'completed', 'completed', 'completed', 'pending', 'cancelled', 'refunded'])[1 + floor(random() * 7)::int]
FROM generate_series(1, 300);

-- Line items: up to 3 slots per order, each a random product. random() is in
-- the subquery's SELECT list so it is evaluated per row (a correlated LATERAL
-- here would risk being materialized once). Duplicate products within an order
-- are merged into a single line item with summed quantity.
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
  s.order_id,
  s.product_id,
  sum(s.quantity)::int,
  pr.price
FROM (
  SELECT
    o.order_id,
    1 + floor(random() * 20)::int AS product_id,
    1 + floor(random() * 4)::int  AS quantity
  FROM orders o
  CROSS JOIN generate_series(1, 3) AS slot
) AS s
JOIN products pr ON pr.product_id = s.product_id
GROUP BY s.order_id, s.product_id, pr.price;

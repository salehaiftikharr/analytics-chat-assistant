-- Analytics dataset: a small e-commerce orders model.
-- These tables are queried READ-ONLY by LLM-generated SQL (see 04_roles.sql).
-- Table/column comments are surfaced to the LLM during schema introspection.

CREATE TABLE customers (
    customer_id  SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    country      TEXT NOT NULL,
    signup_date  DATE NOT NULL
);
COMMENT ON TABLE customers IS 'People who place orders.';
COMMENT ON COLUMN customers.country IS 'Customer country; use for sales-by-region analysis.';
COMMENT ON COLUMN customers.signup_date IS 'Date the customer registered.';

CREATE TABLE products (
    product_id  SERIAL PRIMARY KEY,
    name        TEXT          NOT NULL,
    category    TEXT          NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
);
COMMENT ON TABLE products IS 'Catalog of products available for purchase.';
COMMENT ON COLUMN products.category IS 'Product category, e.g. Electronics, Books, Clothing.';
COMMENT ON COLUMN products.price IS 'Current list price in USD.';

CREATE TABLE orders (
    order_id     SERIAL PRIMARY KEY,
    customer_id  INT  NOT NULL REFERENCES customers (customer_id),
    order_date   DATE NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded'))
);
COMMENT ON TABLE orders IS 'One row per placed order.';
COMMENT ON COLUMN orders.order_date IS 'Date the order was placed.';
COMMENT ON COLUMN orders.status IS 'Order lifecycle status: completed, pending, cancelled, or refunded.';

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES orders (order_id),
    product_id    INT NOT NULL REFERENCES products (product_id),
    quantity      INT NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);
COMMENT ON TABLE order_items IS 'Line items within an order; line revenue = quantity * unit_price.';
COMMENT ON COLUMN order_items.unit_price IS 'Price per unit at the time of purchase (USD).';

-- Indexes on the foreign keys and the common time dimension for analytics.
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_date     ON orders (order_date);
CREATE INDEX idx_items_order     ON order_items (order_id);
CREATE INDEX idx_items_product   ON order_items (product_id);

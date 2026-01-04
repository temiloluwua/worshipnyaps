/*
  # Add Card Game Product

  ## Description
  Inserts the Faith Discussion Card Game as a pre-order product in the shop.

  ## Changes
    - Adds the card game product with pre-order pricing
    - Sets initial stock quantity for pre-orders
    - Categorizes as 'media' type product
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM products WHERE name = 'Faith Discussion Card Game'
  ) THEN
    INSERT INTO products (
      name,
      description,
      price,
      image_url,
      category,
      sizes,
      colors,
      stock_quantity,
      is_active
    ) VALUES (
      'Faith Discussion Card Game',
      'Transform your Bible study with our engaging card game! Perfect for small groups, youth ministries, and family devotions. Each card sparks meaningful conversations about faith, life, and Scripture. Pre-order now and be among the first to receive this unique discussion tool.',
      29.99,
      'https://images.pexels.com/photos/4705997/pexels-photo-4705997.jpeg',
      'media',
      ARRAY[]::text[],
      ARRAY[]::text[],
      1000,
      true
    );
  END IF;
END $$;

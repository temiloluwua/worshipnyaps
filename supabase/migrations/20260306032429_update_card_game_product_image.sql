/*
  # Update Card Game Product Image

  ## Description
  Updates the card game product image to use the new professional product photo.

  ## Changes
    - Updates the image URL for the Faith Discussion Card Game product
*/

UPDATE products
SET image_url = '/1770276478373-d2949528-7589-4954-8240-bdf02d0110c0_(1).png'
WHERE name = 'Faith Discussion Card Game';

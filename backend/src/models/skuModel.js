// ─────────────────────────────────────────
//  SKU DEFINITIONS — edit to match your menu
//  `image` is served by the frontend static server at /assets/items/...
//  and reused by the Telegram bot when it prompts for each item.
// ─────────────────────────────────────────
const SKUS = [
  { id: 1, name: 'Almond Pistachio Croissant', salePrice: 12.00, costPrice: 8.70,  image: '/assets/items/item-a.png' },
  { id: 2, name: 'Korean Garlic Cheese',        salePrice: 10.00, costPrice: 5.90,  image: '/assets/items/item-b.png' },
  { id: 3, name: 'Strawberry Croissant',       salePrice: 12.90, costPrice: 8.80,  image: '/assets/items/item-c.png' },
  { id: 4, name: 'Strawberry Danish',          salePrice: 10.00, costPrice: 5.80,  image: '/assets/items/item-d.png' },
  { id: 5, name: 'Blueberry Danish',           salePrice: 10.00, costPrice: 6.90,  image: '/assets/items/item-e.png' },
  { id: 6, name: 'Biscoff Croissant',          salePrice: 12.00, costPrice: 9.50,  image: '/assets/items/item-f.png' },
  { id: 7, name: 'Butter Croissant',           salePrice: 8.00,  costPrice: 3.50,  image: '/assets/items/item-o.png' },
  { id: 8, name: 'Chocolate Indulgence',       salePrice: 8.40,  costPrice: 7.70,  image: '/assets/items/item-i.png' },
  { id: 9, name: 'Chocolate Fudge',            salePrice: 8.40,  costPrice: 6.80,  image: '/assets/items/item-j.png' },
  { id: 10, name: 'Red Velvet Indulgence',      salePrice: 8.60,  costPrice: 6.60,  image: '/assets/items/item-k.png' },
  { id: 11, name: 'Red Velvet Cheese',          salePrice: 8.60,  costPrice: 6.00,  image: '/assets/items/item-m.png' },
  { id: 12, name: 'Biscoff Cheese',             salePrice: 8.60,  costPrice: 7.80,  image: '/assets/items/item-n.png' },
  { id: 13, name: 'Tiramisu',                   salePrice: 0.00,  costPrice: 12.90, image: '/assets/items/item-g.png' },
  { id: 14, name: 'Chocolate Pistachio Kunafa', salePrice: 0.00,  costPrice: 11.80, image: '/assets/items/item-h.png' },
  { id: 15, name: 'Almond Roche Tiramisu',      salePrice: 0.00,  costPrice: 15.00, image: '/assets/items/item-l.png' },
];

module.exports = SKUS;

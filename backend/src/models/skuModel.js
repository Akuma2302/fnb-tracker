// ─────────────────────────────────────────
//  SKU DEFINITIONS — edit to match your menu
//  `image` is served by the frontend static server at /assets/items/...
//  and reused by the Telegram bot when it prompts for each item.
// ─────────────────────────────────────────
const SKUS = [
  { id: 1,  name: 'Almond Pistachio Croissant', salePrice: 10.90, costPrice: 8.70,  image: '/assets/items/item-a.png' },
  { id: 2,  name: 'Korean Garlic Cheese',        salePrice: 6.90,  costPrice: 5.90,  image: '/assets/items/item-b.png' },
  { id: 3,  name: 'Strawberry Croissant',       salePrice: 10.90, costPrice: 8.80,  image: '/assets/items/item-c.png' },
  { id: 4,  name: 'Strawberry Danish',          salePrice: 6.90,  costPrice: 5.80,  image: '/assets/items/item-d.png' },
  { id: 5,  name: 'Blueberry Danish',           salePrice: 7.90,  costPrice: 6.90,  image: '/assets/items/item-e.png' },
  { id: 6,  name: 'Biscoff Croissant',          salePrice: 11.90, costPrice: 9.50,  image: '/assets/items/item-f.png' },
  { id: 7,  name: 'Tiramisu',                   salePrice: 14.90, costPrice: 12.90, image: '/assets/items/item-g.png' },
  { id: 8,  name: 'Chocolate Pistachio Kunafa', salePrice: 13.90, costPrice: 11.80, image: '/assets/items/item-h.png' },
  { id: 9,  name: 'Chocolate Indulgence',       salePrice: 8.90,  costPrice: 7.70,  image: '/assets/items/item-i.png' },
  { id: 10, name: 'Chocolate Fudge',            salePrice: 7.90,  costPrice: 6.80,  image: '/assets/items/item-j.png' },
  { id: 11, name: 'Red Velvet Indulgence',      salePrice: 7.90,  costPrice: 6.60,  image: '/assets/items/item-k.png' },
  { id: 12, name: 'Almond Roche Tiramisu',      salePrice: 17.90, costPrice: 15.00, image: '/assets/items/item-l.png' },
  { id: 13, name: 'Red Velvet Cheese',          salePrice: 6.90,  costPrice: 6.00,  image: '/assets/items/item-m.png' },
  { id: 14, name: 'Biscoff Cheese',             salePrice: 9.90,  costPrice: 7.80,  image: '/assets/items/item-n.png' },
  { id: 15, name: 'Item O', salePrice: 8.50,  costPrice: 5.50,  image: '/assets/items/item-o.png' },
  { id: 16, name: 'Item P', salePrice: 10.50, costPrice: 7.25,  image: '/assets/items/item-p.png' },
  { id: 17, name: 'Item Q', salePrice: 17.00, costPrice: 12.00, image: '/assets/items/item-q.png' },
  { id: 18, name: 'Item R', salePrice: 7.00,  costPrice: 4.50,  image: '/assets/items/item-r.png' },
  { id: 19, name: 'Item S', salePrice: 11.50, costPrice: 8.00,  image: '/assets/items/item-s.png' },
  { id: 20, name: 'Item T', salePrice: 15.50, costPrice: 11.00, image: '/assets/items/item-t.png' },
];

module.exports = SKUS;

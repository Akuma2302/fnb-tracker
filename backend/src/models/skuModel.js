// ─────────────────────────────────────────
//  SKU DEFINITIONS — edit to match your menu
//  `image` is served by the frontend static server at /assets/items/...
//  and reused by the Telegram bot when it prompts for each item.
// ─────────────────────────────────────────
const SKUS = [
  { id: 1,  name: 'Item A', salePrice: 10.00, costPrice: 7.00,  image: '/assets/items/item-a.png' },
  { id: 2,  name: 'Item B', salePrice: 15.00, costPrice: 10.00, image: '/assets/items/item-b.png' },
  { id: 3,  name: 'Item C', salePrice: 8.00,  costPrice: 4.50,  image: '/assets/items/item-c.png' },
  { id: 4,  name: 'Item D', salePrice: 12.00, costPrice: 9.00,  image: '/assets/items/item-d.png' },
  { id: 5,  name: 'Item E', salePrice: 10.00, costPrice: 8.50,  image: '/assets/items/item-e.png' },
  { id: 6,  name: 'Item F', salePrice: 9.00,  costPrice: 6.00,  image: '/assets/items/item-f.png' },
  { id: 7,  name: 'Item G', salePrice: 11.00, costPrice: 7.50,  image: '/assets/items/item-g.png' },
  { id: 8,  name: 'Item H', salePrice: 14.00, costPrice: 10.50, image: '/assets/items/item-h.png' },
  { id: 9,  name: 'Item I', salePrice: 7.50,  costPrice: 5.00,  image: '/assets/items/item-i.png' },
  { id: 10, name: 'Item J', salePrice: 13.00, costPrice: 9.50,  image: '/assets/items/item-j.png' },
  { id: 11, name: 'Item K', salePrice: 6.50,  costPrice: 4.00,  image: '/assets/items/item-k.png' },
  { id: 12, name: 'Item L', salePrice: 16.00, costPrice: 11.50, image: '/assets/items/item-l.png' },
  { id: 13, name: 'Item M', salePrice: 9.50,  costPrice: 6.50,  image: '/assets/items/item-m.png' },
  { id: 14, name: 'Item N', salePrice: 12.50, costPrice: 8.75,  image: '/assets/items/item-n.png' },
  { id: 15, name: 'Item O', salePrice: 8.50,  costPrice: 5.50,  image: '/assets/items/item-o.png' },
  { id: 16, name: 'Item P', salePrice: 10.50, costPrice: 7.25,  image: '/assets/items/item-p.png' },
  { id: 17, name: 'Item Q', salePrice: 17.00, costPrice: 12.00, image: '/assets/items/item-q.png' },
  { id: 18, name: 'Item R', salePrice: 7.00,  costPrice: 4.50,  image: '/assets/items/item-r.png' },
  { id: 19, name: 'Item S', salePrice: 11.50, costPrice: 8.00,  image: '/assets/items/item-s.png' },
  { id: 20, name: 'Item T', salePrice: 15.50, costPrice: 11.00, image: '/assets/items/item-t.png' },
];

module.exports = SKUS;

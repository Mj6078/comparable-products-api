const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const API_TOKEN = process.env.API_TOKEN;
const STORE_HASH = '6yvytzf4lr';

app.get('/', (req, res) => {
  res.send('✅ Vercel-compatible serverless API is working.');
});

app.get('/comparable-products', async (req, res) => {
  const skuQuery = req.query.skus;
  if (!skuQuery) return res.status(400).json({ error: 'Missing skus query param' });

  const url = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/catalog/products?sku:in=${skuQuery}&include=custom_fields,primary_image`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.data) return res.json([]);

    const result = data.data.map(p => {
      const customFields = p.custom_fields || [];
      const unit = customFields.find(f => f.name === 'per-unit-price-1');
      const qty = customFields.find(f => f.name === 'quantity');
      const bulkQty = customFields.find(f => f.name === 'bulk-quantity');
      const bulkPrice = customFields.find(f => f.name === 'bulk-price');
      const bulkPrice1 = customFields.find(f => f.name === 'bulk-price1');

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        url: p.custom_url?.url || '#',
        image: p.primary_image?.url_standard || '',
        price: (p.price || 0).toFixed(2),
        salePrice: p.sale_price ? p.sale_price.toFixed(2) : null,
        unitPrice: unit ? unit.value : '',
        quantity: qty ? qty.value : '',
        bulkQuantity: bulkQty ? bulkQty.value : '',
        bulkPrice: bulkPrice ? bulkPrice.value : '',
        bulkPriceSale: bulkPrice1 ? bulkPrice1.value : ''
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ API failed:", err);
    res.status(500).json({ error: 'API fetch error' });
  }
});

// ❌ DO NOT use app.listen() on Vercel
module.exports = app;

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

const API_TOKEN = process.env.API_TOKEN;
const STORE_HASH = '6yvytzf4lr';

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ Server is running! Use /comparable-products?skus=s0001,s0002');
});

app.get('/comparable-products', async (req, res) => {
  const skuQuery = req.query.skus;
  if (!skuQuery) return res.status(400).json({ error: 'Missing skus query param' });

  const url = `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/catalog/products?sku:in=${skuQuery}&include=custom_fields,primary_image`;
  console.log("📡 Fetching from:", url);

  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log("🚫 No products found for:", skuQuery);
      return res.json([]);
    }

    const result = data.data.map(p => {
      const customFields = p.custom_fields || [];

      const unit = customFields.find(f => f.name === 'per-unit-price-1');
      const qty = customFields.find(f => f.name === 'quantity');
      const bulkQty = customFields.find(f => f.name === 'bulk-quantity');
      const bulkPrice = customFields.find(f => f.name === 'bulk-price');
      const bulkPrice1 = customFields.find(f => f.name === 'bulk-price1'); // Sale bulk price

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

    console.log("✅ Products found:", result.map(r => r.sku));
    res.json(result);
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

const PORT = process.env.PORT || 1988;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

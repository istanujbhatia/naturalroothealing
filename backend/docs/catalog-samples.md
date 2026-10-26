# Catalog sample documents

These are representative sanitized documents derived from the current storefront catalog. The product final price is calculated by the backend and is shown here as a derived value, not as client input.

## Category

```json
{
  "name": "Daily vitality",
  "slug": "daily-vitality",
  "description": "",
  "status": "active",
  "sortOrder": 0
}
```

## Product

```json
{
  "name": "Testo Boost Capsules",
  "slug": "testo-boost-capsules",
  "description": "A thoughtfully composed capsule format for an intentional daily routine.",
  "details": "A thoughtfully composed capsule format for an intentional daily routine.",
  "ingredients": "Please refer to the final product label for complete ingredients and recommended use.",
  "size": "60 capsules",
  "category": "<category ObjectId>",
  "images": [
    {
      "reference": "/assets/testo-boost-capsules.jpg",
      "altText": "Testo Boost Capsules"
    },
    {
      "reference": "/assets/product-gallery-detail.jpg",
      "altText": "Testo Boost Capsules detail"
    },
    {
      "reference": "/assets/journal-slower-routine.jpg",
      "altText": "Testo Boost Capsules in a wellness routine"
    }
  ],
  "currency": "USD",
  "listPriceMinor": 22111,
  "discount": {
    "type": "percentage",
    "value": 10
  },
  "finalPriceMinor": 19900,
  "status": "active"
}
```

The current storefront has no SKU, variant, stock, tax, shipping, or inventory fields, so those fields are intentionally not seeded.

export const seedCategories = [
  {
    name: 'Daily vitality',
    slug: 'daily-vitality',
    description: '',
    status: 'active' as const,
    sortOrder: 0,
  },
  {
    name: 'Herbal collection',
    slug: 'herbal-collection',
    description: '',
    status: 'active' as const,
    sortOrder: 1,
  },
];

export const seedProducts = [
  {
    name: 'Testo Boost Capsules',
    slug: 'testo-boost-capsules',
    description: 'A thoughtfully composed capsule format for an intentional daily routine.',
    details: 'A thoughtfully composed capsule format for an intentional daily routine.',
    ingredients: 'Please refer to the final product label for complete ingredients and recommended use.',
    size: '60 capsules',
    categorySlug: 'daily-vitality',
    images: [
      { reference: '/assets/testo-boost-capsules.jpg', altText: 'Testo Boost Capsules' },
      { reference: '/assets/product-gallery-detail.jpg', altText: 'Testo Boost Capsules detail' },
      { reference: '/assets/journal-slower-routine.jpg', altText: 'Testo Boost Capsules in a wellness routine' },
    ],
    currency: 'USD' as const,
    listPriceMinor: 22111,
    discount: { type: 'percentage' as const, value: 10 },
    expectedFinalPriceMinor: 19900,
    status: 'active' as const,
  },
  {
    name: 'Dr. Sebi Herbal Kit',
    slug: 'dr-sebi-herbal-kit',
    description: 'A considered herbal kit designed to sit beautifully within a mindful wellness ritual.',
    details: 'A considered herbal kit designed to sit beautifully within a mindful wellness ritual.',
    ingredients: 'Please refer to the final product label for complete ingredients and recommended use.',
    size: '60 tablets',
    categorySlug: 'herbal-collection',
    images: [
      { reference: '/assets/dr-sebi-herbal-kit.jpg', altText: 'Dr. Sebi Herbal Kit' },
      { reference: '/assets/triphala-powder.jpg', altText: 'Dr. Sebi Herbal Kit detail' },
      { reference: '/assets/product-gallery-detail.jpg', altText: 'Dr. Sebi Herbal Kit in a wellness routine' },
    ],
    currency: 'USD' as const,
    listPriceMinor: 24875,
    discount: { type: 'percentage' as const, value: 20 },
    expectedFinalPriceMinor: 19900,
    status: 'active' as const,
  },
];

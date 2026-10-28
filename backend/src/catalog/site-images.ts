export const SITE_IMAGE_DEFINITIONS = [
  { key: 'brand-logo.png', label: 'Brand logo', description: 'Header and admin portal logo.', defaultReference: '/assets/brand-logo.png' },
  { key: 'home-hero-image.png', label: 'Home hero image', description: 'Large image at the top of the home page.', defaultReference: '/assets/home-hero-image.png' },
  { key: 'philosophy-banner.png', label: 'Philosophy banner', description: 'Image beside the home page philosophy section.', defaultReference: '/assets/philosophy-banner.png' },
  { key: 'shop-banner.png', label: 'Shop banner', description: 'Banner shown at the top of the shop page.', defaultReference: '/assets/shop-banner.png' },
  { key: 'about-hero.jpg', label: 'About hero image', description: 'Large image at the top of the About page.', defaultReference: '/assets/about-hero.jpg' },
  { key: 'about-ritual.jpg', label: 'About ritual image', description: 'Image in the About page ritual section.', defaultReference: '/assets/about-ritual.jpg' },
  { key: 'ayurveda-hero.jpg', label: 'Ayurveda hero image', description: 'Large image at the top of the Ayurveda page.', defaultReference: '/assets/ayurveda-hero.jpg' },
  { key: 'journal-banner.png', label: 'Journal banner', description: 'Banner shown at the top of the Journal page.', defaultReference: '/assets/journal-banner.png' },
  { key: 'contact-hero.jpg', label: 'Contact hero image', description: 'Large image at the top of the Contact page.', defaultReference: '/assets/contact-hero.jpg' },
  { key: 'journal-slower-routine.jpg', label: 'Journal: slower routine', description: 'Journal article card and detail image.', defaultReference: '/assets/journal-slower-routine.jpg' },
  { key: 'journal-ayurveda.jpg', label: 'Journal: Ayurveda', description: 'Journal article card image.', defaultReference: '/assets/journal-ayurveda.jpg' },
  { key: 'journal-botanicals.jpg', label: 'Journal: botanicals', description: 'Journal article card image.', defaultReference: '/assets/journal-botanicals.jpg' },
] as const;

export const SITE_IMAGE_KEYS = SITE_IMAGE_DEFINITIONS.map((image) => image.key);

export function resolvedSiteImages(saved: readonly { key?: string; reference?: string }[] = []) {
  const references = new Map(saved.map((image) => [image.key, image.reference]));
  return SITE_IMAGE_DEFINITIONS.map((image) => ({
    ...image,
    reference: references.get(image.key) || image.defaultReference,
  }));
}

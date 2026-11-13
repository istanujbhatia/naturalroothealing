export const SITE_IMAGE_DEFINITIONS = [
  { key: 'brand-logo.png', label: 'Brand logo', description: 'Header and admin portal logo.', defaultReference: '/assets/brand-logo.png', defaultAltText: 'Natural Root Healing logo' },
  { key: 'home-hero-image.png', label: 'Home hero image', description: 'Large image at the top of the home page.', defaultReference: '/assets/home-hero-image.png', defaultAltText: 'Natural wellness products surrounded by botanicals' },
  { key: 'philosophy-banner.png', label: 'Philosophy banner', description: 'Image beside the home page philosophy section.', defaultReference: '/assets/philosophy-banner.png', defaultAltText: 'Botanical ingredients for a grounded wellness ritual' },
  { key: 'shop-banner.png', label: 'Shop banner', description: 'Banner shown at the top of the shop page.', defaultReference: '/assets/shop-banner.png', defaultAltText: 'Natural Root Healing product collection' },
  { key: 'about-hero.jpg', label: 'About hero image', description: 'Large image at the top of the About page.', defaultReference: '/assets/about-hero.jpg', defaultAltText: 'Natural Root Healing botanical landscape' },
  { key: 'about-ritual.jpg', label: 'About ritual image', description: 'Image in the About page ritual section.', defaultReference: '/assets/about-ritual.jpg', defaultAltText: 'A calm botanical wellness ritual' },
  { key: 'ayurveda-hero.jpg', label: 'Ayurveda hero image', description: 'Large image at the top of the Ayurveda page.', defaultReference: '/assets/ayurveda-hero.jpg', defaultAltText: 'Ayurvedic herbs and natural ingredients' },
  { key: 'journal-banner.png', label: 'Journal banner', description: 'Banner shown at the top of the Journal page.', defaultReference: '/assets/journal-banner.png', defaultAltText: 'Natural Root Healing journal' },
  { key: 'contact-hero.jpg', label: 'Contact hero image', description: 'Large image at the top of the Contact page.', defaultReference: '/assets/contact-hero.jpg', defaultAltText: 'A thoughtful natural wellness setting' },
] as const;

export const SITE_IMAGE_KEYS = SITE_IMAGE_DEFINITIONS.map((image) => image.key);

export function resolvedSiteImages(saved: readonly { key?: string; reference?: string; altText?: string }[] = []) {
  const references = new Map(saved.map((image) => [image.key, image]));
  return SITE_IMAGE_DEFINITIONS.map((image) => ({
    ...image,
    reference: references.get(image.key)?.reference || image.defaultReference,
    altText: references.get(image.key)?.altText || image.defaultAltText,
  }));
}

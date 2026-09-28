import { API_URL } from '@/config/api';

const DEFAULT_HEADING = 'Montserrat';
const DEFAULT_BODY = 'Manrope';
const LINK_ID = 'brand-fonts-link';

/**
 * Applies the brand typography chosen in Admin > Add-On > Charges.
 *
 * The apps ship with Montserrat + Manrope already loaded, so nothing here has to
 * succeed for the app to look right — this only takes over when the admin has
 * picked something different. If the request or the font load fails, the CSS
 * fallbacks in index.css keep the original fonts.
 */
export async function applyBrandFonts(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/order-charges`);
    const data = await response.json();
    if (!data?.success || !data.data) return;

    const heading = (data.data.brandHeadingFont || DEFAULT_HEADING).trim();
    const body = (data.data.brandBodyFont || DEFAULT_BODY).trim();

    // Nothing to do when the admin is still on the fonts the app already bundles
    if (heading === DEFAULT_HEADING && body === DEFAULT_BODY) return;

    const families = [...new Set([heading, body])]
      .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700;800;900`)
      .join('&');

    const existing = document.getElementById(LINK_ID);
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);

    document.documentElement.style.setProperty('--brand-heading-font', `'${heading}'`);
    document.documentElement.style.setProperty('--brand-body-font', `'${body}'`);
  } catch (error) {
    console.error('Could not apply brand fonts, keeping the defaults:', error);
  }
}

"use client";
import { useEffect } from "react";
import { API_URL } from "@/config/api";

const DEFAULT_HEADING = "Montserrat";
const DEFAULT_BODY = "Manrope";
const LINK_ID = "brand-fonts-link";

/**
 * Applies the brand typography chosen in Admin > Add-On > Charges.
 * The app already bundles Montserrat + Manrope, so this only takes over when the
 * admin has picked something else. Any failure leaves the bundled fonts in place.
 */
export default function BrandFonts() {
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/order-charges`);
        const data = await response.json();
        if (!data?.success || !data.data) return;

        const heading = (data.data.brandHeadingFont || DEFAULT_HEADING).trim();
        const body = (data.data.brandBodyFont || DEFAULT_BODY).trim();
        if (heading === DEFAULT_HEADING && body === DEFAULT_BODY) return;

        const families = [...new Set([heading, body])]
          .map(f => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800;900`)
          .join("&");

        document.getElementById(LINK_ID)?.remove();
        const link = document.createElement("link");
        link.id = LINK_ID;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
        document.head.appendChild(link);

        document.documentElement.style.setProperty("--brand-heading-font", `'${heading}'`);
        document.documentElement.style.setProperty("--brand-body-font", `'${body}'`);
      } catch (error) {
        console.error("Could not apply brand fonts, keeping the defaults:", error);
      }
    })();
  }, []);

  return null;
}

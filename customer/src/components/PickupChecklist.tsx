import { useEffect, useState } from "react";
import { Check, AlertTriangle, Recycle } from "lucide-react";
import { API_URL } from '@/config/api';

/**
 * Shown before the captain arrives: what the customer should have ready,
 * what we will and will not take responsibility for, and the paper reuse note.
 * Every line is editable in Admin > Add-On > Charges; the values below are the
 * fallbacks used if the setting has not been saved yet or the request fails.
 */
const DEFAULTS = {
  enabled: true,
  title: 'Before your pickup',
  intro: 'For a smooth pickup, please ensure that:',
  points: [
    'The garment quantities match your booking.',
    'Garments are added under the correct categories (for example, Linen Shirts and Silk Sarees).',
    'The garments are kept ready as per your booking.',
  ],
  note: 'Our pickup team will collect only the garments included in the confirmed booking.',
  importantTitle: 'Important',
  importantText: 'Urban Steam does not take responsibility for cash, jewellery, or any personal items left inside garments. Kindly check all pockets before handing over your clothes.',
  sustainabilityTitle: 'A small step towards sustainable service',
  sustainabilityText: "If the paper inside your garments is still clean and usable, you can keep it aside for us. We'll be happy to collect and reuse it with your next pickup.",
};

/**
 * `variant` only changes the wrapper: "card" is the standalone white panel used
 * on a page, "plain" drops the panel so the list can sit inside something that
 * already is one, such as the checkout dialog.
 */
const PickupChecklist = ({ variant = 'card' }: { variant?: 'card' | 'plain' }) => {
  const [content, setContent] = useState(DEFAULTS);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(`${API_URL}/api/order-charges`);
        const data = await response.json();
        if (!data?.success || !data.data) return;
        const c = data.data;
        const points = String(c.pickupChecklistPoints ?? '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean);

        setContent({
          enabled: c.pickupChecklistEnabled !== false,
          title: c.pickupChecklistTitle || DEFAULTS.title,
          intro: c.pickupChecklistIntro || DEFAULTS.intro,
          points: points.length > 0 ? points : DEFAULTS.points,
          note: c.pickupChecklistNote || DEFAULTS.note,
          importantTitle: c.pickupImportantTitle || DEFAULTS.importantTitle,
          importantText: c.pickupImportantText || DEFAULTS.importantText,
          sustainabilityTitle: c.pickupSustainabilityTitle || DEFAULTS.sustainabilityTitle,
          sustainabilityText: c.pickupSustainabilityText || DEFAULTS.sustainabilityText,
        });
      } catch (error) {
        console.error('Could not load pickup checklist content, using defaults:', error);
      }
    };
    loadContent();
  }, []);

  if (!content.enabled) return null;

  return (
    <div
      className={variant === 'plain' ? '' : 'bg-white rounded-2xl p-4 shadow-md border-2'}
      style={variant === 'plain' ? undefined : { borderColor: '#ede9fe' }}
    >
      {variant === 'card' && (
        <h3 className="text-sm sm:text-base font-bold text-black mb-1">{content.title}</h3>
      )}
      {content.intro && <p className="text-xs sm:text-sm text-gray-600 mb-3">{content.intro}</p>}

      {content.points.length > 0 && (
        <ul className="space-y-2 mb-3">
          {content.points.map((point, index) => (
            <li key={index} className="flex items-start gap-2">
              <span
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
              <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      )}

      {content.note && (
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-line">{content.note}</p>
      )}

      {content.importantText && (
        <div className="rounded-xl p-3 mb-3 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
            <div>
              {content.importantTitle && (
                <p className="text-xs sm:text-sm font-bold mb-0.5" style={{ color: '#b45309' }}>{content.importantTitle}</p>
              )}
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: '#92400e' }}>
                {content.importantText}
              </p>
            </div>
          </div>
        </div>
      )}

      {content.sustainabilityText && (
        <div className="rounded-xl p-3 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="flex items-start gap-2">
            <Recycle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
            <div>
              {content.sustainabilityTitle && (
                <p className="text-xs sm:text-sm font-bold mb-0.5" style={{ color: '#15803d' }}>{content.sustainabilityTitle}</p>
              )}
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: '#166534' }}>
                {content.sustainabilityText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupChecklist;

/**
 * In-app service menu for deposits and full payments.
 * Amounts are in the smallest currency unit (USD cents).
 */
export const BOOKING_SERVICES = [
  {
    id: "signature-fade",
    name: "Signature Fade",
    duration: "45 min",
    description: "Consultation, precision fade, crisp lineup, finish.",
    fullCents: 4500,
    depositCents: 1500,
  },
  {
    id: "luxury-cut",
    name: "Luxury Cut & Style",
    duration: "75 min",
    description: "Full cut, hot towel, scalp detail, styled finish.",
    fullCents: 7500,
    depositCents: 2500,
  },
  {
    id: "beard-sculpt",
    name: "Beard Sculpt",
    duration: "30 min",
    description: "Beard shaping, cheek taper, razor-defined edges.",
    fullCents: 3000,
    depositCents: 1000,
  },
];

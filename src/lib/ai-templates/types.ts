/**
 * AI Brain template for a business category.
 * Used to pre-populate onboarding and AI configuration.
 */
export interface BusinessTemplate {
  /** Category key (e.g. "hvac", "plumbing") */
  category: string;
  /** Category display name */
  label: string;
  /** AI system prompt — personality + role */
  systemPrompt: string;
  /** Default services offered */
  services: string[];
  /** Industry FAQs with answers */
  faqs: { question: string; answer: string }[];
  /** Pricing guidance for top services */
  pricingGuidance: string;
  /** Response style: tone, pace, formality */
  responseStyle: string;
  /** What info to collect from leads, red flags */
  leadCollectionRules: string;
  /** How to handle appointment scheduling */
  appointmentBookingRules: string;
  /** Default greeting message */
  greetingMessage: string;
  /** Whether this category handles emergencies */
  emergencyService: boolean;
  /** Business hours default */
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

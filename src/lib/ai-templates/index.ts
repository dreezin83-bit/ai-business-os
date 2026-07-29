/**
 * AI Brain templates index — maps category keys to BusinessTemplate objects.
 */
import type { BusinessTemplate } from "./types";
import { hvacTemplate } from "./hvac";
import { plumbingTemplate } from "./plumbing";
import { roofingTemplate } from "./roofing";
import { electricalTemplate } from "./electrical";
import { cleaningTemplate } from "./cleaning";
import { landscapingTemplate } from "./landscaping";
import { pestControlTemplate } from "./pest-control";
import { dentalTemplate } from "./dental";
import { lawFirmTemplate } from "./law-firm";
import { realEstateTemplate } from "./real-estate";
import { generalContractorTemplate } from "./general-contractor";
import { otherTemplate } from "./other";

export const TEMPLATES: Record<string, BusinessTemplate> = {
  hvac: hvacTemplate,
  plumbing: plumbingTemplate,
  roofing: roofingTemplate,
  electrical: electricalTemplate,
  cleaning: cleaningTemplate,
  landscaping: landscapingTemplate,
  "pest-control": pestControlTemplate,
  dental: dentalTemplate,
  "law-firm": lawFirmTemplate,
  "real-estate": realEstateTemplate,
  "general-contractor": generalContractorTemplate,
  other: otherTemplate,
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function getTemplate(category: string): BusinessTemplate | undefined {
  return TEMPLATES[category];
}

export { type BusinessTemplate } from "./types";

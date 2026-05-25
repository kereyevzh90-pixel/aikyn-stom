export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface ClinicConfig {
  clinicName: string;
  city: string;
  address: string;
  phone: string;
  schedule: string;
  systemPrompt: string;
  faq: FaqItem[];
}

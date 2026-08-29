export type LeadSoftware = "Fullslate" | "Acuity" | "MassageBook" | "None visible" | "Unknown";

export interface Lead {
  id: string;
  business: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
  location: string;
  software: LeadSoftware;
  talkingPoint: string;
}

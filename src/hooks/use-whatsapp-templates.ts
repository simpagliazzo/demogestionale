import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppTemplate {
  id: string;
  template_type: string;
  template_name: string;
  template_content: string;
  description: string | null;
}

export interface AgencySettings {
  id: string;
  business_name: string;
  legal_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_number: string | null;
  fiscal_code: string | null;
  logo_url: string | null;
}

export function useWhatsAppTemplates() {
  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("template_type");
      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });

  const { data: agencySettings } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as AgencySettings | null;
    },
  });

  const getTemplate = (templateType: string): string | null => {
    const template = templates.find((t) => t.template_type === templateType);
    return template?.template_content || null;
  };

  const replaceAgencyPlaceholders = (content: string): string => {
    if (!agencySettings) return content;

    return content
      .replace(/\{NOME_AGENZIA\}/g, agencySettings.business_name || "")
      .replace(/\{TELEFONO_AGENZIA\}/g, agencySettings.phone || "")
      .replace(/\{EMAIL_AGENZIA\}/g, agencySettings.email || "")
      .replace(/\{SITO_AGENZIA\}/g, agencySettings.website || "")
      .replace(/\{INDIRIZZO_AGENZIA\}/g, agencySettings.address || "");
  };

  const formatMessage = (
    templateType: string,
    placeholders: Record<string, string | number | null | undefined>
  ): string | null => {
    const template = getTemplate(templateType);
    if (!template) return null;

    let message = template;

    // Replace all placeholders
    Object.entries(placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      message = message.replace(regex, value?.toString() || "");
    });

    // Replace agency placeholders
    message = replaceAgencyPlaceholders(message);

    return message;
  };

  return {
    templates,
    agencySettings,
    getTemplate,
    formatMessage,
    replaceAgencyPlaceholders,
  };
}

export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[^\d]/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "39" + cleaned.substring(1);
  } else if (cleaned.length <= 10) {
    cleaned = "39" + cleaned;
  }
  
  return cleaned;
}

export function openWhatsApp(phone: string, message: string) {
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

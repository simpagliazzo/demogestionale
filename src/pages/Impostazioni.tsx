import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Building2, MessageSquare, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AgencySettings {
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

interface WhatsAppTemplate {
  id: string;
  template_type: string;
  template_name: string;
  template_content: string;
  description: string | null;
}

const PLACEHOLDERS_INFO = {
  booking_confirmation: [
    { placeholder: "{nome_partecipante}", description: "Nome completo del partecipante" },
    { placeholder: "{titolo_viaggio}", description: "Titolo del viaggio" },
    { placeholder: "{destinazione}", description: "Destinazione del viaggio" },
    { placeholder: "{data_partenza}", description: "Data di partenza" },
    { placeholder: "{data_rientro}", description: "Data di rientro" },
    { placeholder: "{tipo_camera}", description: "Tipo di camera assegnata" },
    { placeholder: "{totale}", description: "Importo totale" },
    { placeholder: "{versato}", description: "Importo già versato" },
    { placeholder: "{saldo}", description: "Saldo da pagare" },
    { placeholder: "{link_documenti}", description: "Link per caricare documenti" },
    { placeholder: "{link_posto_bus}", description: "Link per scegliere posto bus" },
    { placeholder: "{nome_agenzia}", description: "Nome dell'agenzia" },
    { placeholder: "{telefono_agenzia}", description: "Telefono dell'agenzia" },
  ],
  quote: [
    { placeholder: "{nome_cliente}", description: "Nome del cliente" },
    { placeholder: "{destinazione}", description: "Destinazione" },
    { placeholder: "{data_partenza}", description: "Data partenza" },
    { placeholder: "{data_rientro}", description: "Data rientro" },
    { placeholder: "{num_passeggeri}", description: "Numero passeggeri" },
    { placeholder: "{totale}", description: "Totale preventivo" },
    { placeholder: "{nome_agenzia}", description: "Nome dell'agenzia" },
    { placeholder: "{telefono_agenzia}", description: "Telefono dell'agenzia" },
    { placeholder: "{email_agenzia}", description: "Email dell'agenzia" },
  ],
  room_confirmation: [
    { placeholder: "{titolo_viaggio}", description: "Titolo del viaggio" },
    { placeholder: "{tipo_camera}", description: "Tipo di camera" },
    { placeholder: "{occupanti}", description: "Elenco occupanti" },
    { placeholder: "{data_partenza}", description: "Data partenza" },
    { placeholder: "{data_rientro}", description: "Data rientro" },
    { placeholder: "{nome_agenzia}", description: "Nome dell'agenzia" },
    { placeholder: "{telefono_agenzia}", description: "Telefono dell'agenzia" },
  ],
  payment_reminder: [
    { placeholder: "{nome_partecipante}", description: "Nome del partecipante" },
    { placeholder: "{titolo_viaggio}", description: "Titolo del viaggio" },
    { placeholder: "{saldo}", description: "Saldo da pagare" },
    { placeholder: "{nome_agenzia}", description: "Nome dell'agenzia" },
    { placeholder: "{telefono_agenzia}", description: "Telefono dell'agenzia" },
  ],
};

export default function Impostazioni() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carica impostazioni agenzia
      const { data: agencyData, error: agencyError } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .single();

      if (agencyError && agencyError.code !== "PGRST116") {
        throw agencyError;
      }

      setAgencySettings(agencyData);

      // Carica template WhatsApp
      const { data: templatesData, error: templatesError } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("template_type");

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Errore nel caricamento:", error);
      toast.error("Errore nel caricamento delle impostazioni");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgency = async () => {
    if (!agencySettings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agency_settings")
        .update({
          business_name: agencySettings.business_name,
          legal_name: agencySettings.legal_name,
          address: agencySettings.address,
          city: agencySettings.city,
          postal_code: agencySettings.postal_code,
          province: agencySettings.province,
          country: agencySettings.country,
          phone: agencySettings.phone,
          email: agencySettings.email,
          website: agencySettings.website,
          vat_number: agencySettings.vat_number,
          fiscal_code: agencySettings.fiscal_code,
        })
        .eq("id", agencySettings.id);

      if (error) throw error;
      toast.success("Impostazioni agenzia salvate con successo");
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      toast.error("Errore nel salvataggio delle impostazioni");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (template: WhatsAppTemplate) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_templates")
        .update({
          template_name: template.template_name,
          template_content: template.template_content,
        })
        .eq("id", template.id);

      if (error) throw error;
      toast.success(`Template "${template.template_name}" salvato con successo`);
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      toast.error("Errore nel salvataggio del template");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (id: string, field: string, value: string) => {
    setTemplates(prev => 
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Impostazioni</h1>
        <p className="text-muted-foreground mt-1">
          Configura i dati dell'agenzia e personalizza i messaggi WhatsApp
        </p>
      </div>

      <Tabs defaultValue="agency" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agency" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dati Agenzia
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Template WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agency">
          <Card>
            <CardHeader>
              <CardTitle>Dati dell'Agenzia</CardTitle>
              <CardDescription>
                Inserisci i dati della tua agenzia. Questi verranno utilizzati nei messaggi WhatsApp e nei documenti.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {agencySettings && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nome Attività *</Label>
                      <Input
                        id="business_name"
                        value={agencySettings.business_name}
                        onChange={(e) => setAgencySettings({ ...agencySettings, business_name: e.target.value })}
                        placeholder="Nome commerciale"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal_name">Ragione Sociale</Label>
                      <Input
                        id="legal_name"
                        value={agencySettings.legal_name || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, legal_name: e.target.value })}
                        placeholder="Ragione sociale legale"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">Partita IVA</Label>
                      <Input
                        id="vat_number"
                        value={agencySettings.vat_number || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, vat_number: e.target.value })}
                        placeholder="IT12345678901"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscal_code">Codice Fiscale</Label>
                      <Input
                        id="fiscal_code"
                        value={agencySettings.fiscal_code || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, fiscal_code: e.target.value })}
                        placeholder="Codice fiscale"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Indirizzo</Label>
                    <Input
                      id="address"
                      value={agencySettings.address || ""}
                      onChange={(e) => setAgencySettings({ ...agencySettings, address: e.target.value })}
                      placeholder="Via, numero civico"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="city">Città</Label>
                      <Input
                        id="city"
                        value={agencySettings.city || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, city: e.target.value })}
                        placeholder="Città"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">CAP</Label>
                      <Input
                        id="postal_code"
                        value={agencySettings.postal_code || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, postal_code: e.target.value })}
                        placeholder="00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Provincia</Label>
                      <Input
                        id="province"
                        value={agencySettings.province || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, province: e.target.value })}
                        placeholder="NA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefono</Label>
                      <Input
                        id="phone"
                        value={agencySettings.phone || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, phone: e.target.value })}
                        placeholder="+39 xxx xxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={agencySettings.email || ""}
                        onChange={(e) => setAgencySettings({ ...agencySettings, email: e.target.value })}
                        placeholder="info@agenzia.it"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Sito Web</Label>
                    <Input
                      id="website"
                      value={agencySettings.website || ""}
                      onChange={(e) => setAgencySettings({ ...agencySettings, website: e.target.value })}
                      placeholder="https://www.agenzia.it"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveAgency} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salva Dati Agenzia
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Template Messaggi WhatsApp</CardTitle>
              <CardDescription>
                Personalizza i messaggi che verranno inviati via WhatsApp. Usa i segnaposto per inserire dati dinamici.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-4">
                {templates.map((template) => (
                  <AccordionItem key={template.id} value={template.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">{template.template_name}</span>
                        <span className="text-sm text-muted-foreground">{template.description}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Nome Template</Label>
                        <Input
                          value={template.template_name}
                          onChange={(e) => updateTemplate(template.id, "template_name", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Contenuto Messaggio</Label>
                        <Textarea
                          value={template.template_content}
                          onChange={(e) => updateTemplate(template.id, "template_content", e.target.value)}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>

                      {PLACEHOLDERS_INFO[template.template_type as keyof typeof PLACEHOLDERS_INFO] && (
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Segnaposto disponibili</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {PLACEHOLDERS_INFO[template.template_type as keyof typeof PLACEHOLDERS_INFO].map((p) => (
                              <div key={p.placeholder} className="text-sm">
                                <code className="bg-background px-1 py-0.5 rounded text-primary">{p.placeholder}</code>
                                <span className="text-muted-foreground ml-2">- {p.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button onClick={() => handleSaveTemplate(template)} disabled={saving}>
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Salva Template
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

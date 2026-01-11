-- Seed data for WhatsApp templates (will be automatically populated on new projects)
INSERT INTO public.whatsapp_templates (template_type, template_name, template_content, description)
VALUES 
  ('booking_confirmation', 'Conferma Prenotazione', 'Gentile {nome_partecipante},

La sua prenotazione per il viaggio "{titolo_viaggio}" è confermata!

📍 Destinazione: {destinazione}
📅 Partenza: {data_partenza}
📅 Rientro: {data_rientro}
🛏️ Sistemazione: {tipo_camera}

💰 Riepilogo economico:
- Totale: €{totale}
- Versato: €{versato}
- Saldo: €{saldo}
{link_documenti}
{link_posto_bus}
{link_conferma}

Cordiali saluti,
{nome_agenzia}
{telefono_agenzia}', 'Template per la conferma di prenotazione viaggio'),

  ('payment_reminder', 'Promemoria Pagamento', 'Gentile {nome_partecipante},

Le ricordiamo che per il viaggio "{titolo_viaggio}" risulta un saldo di €{saldo} da versare.

Per informazioni contattaci.

{nome_agenzia}
{telefono_agenzia}', 'Template per promemoria pagamento'),

  ('quote', 'Preventivo', 'Gentile {nome_cliente},

Ecco il preventivo richiesto per il viaggio a {destinazione}:

📅 Date: {data_partenza} - {data_rientro}
👥 Passeggeri: {num_passeggeri}

💰 Totale: €{totale}

Il preventivo è valido per 7 giorni.

Per confermare, contattaci!

{nome_agenzia}
{telefono_agenzia}
{email_agenzia}', 'Template per invio preventivo'),

  ('room_confirmation', 'Conferma Camera', 'Gentile Cliente,

Camera confermata per il viaggio "{titolo_viaggio}"!

🛏️ Tipo camera: {tipo_camera}
👥 Occupanti: {occupanti}

📅 Partenza: {data_partenza}
📅 Rientro: {data_rientro}

{nome_agenzia}
{telefono_agenzia}', 'Template per conferma assegnazione camera')

ON CONFLICT (template_type) DO NOTHING;
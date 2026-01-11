-- Cancella il vecchio seed e inserisce i dati completi per nuovi progetti
DELETE FROM public.agency_settings WHERE business_name = '';

-- Inserisci dati agenzia completi (se non esiste già)
INSERT INTO public.agency_settings (
  business_name,
  legal_name,
  address,
  city,
  postal_code,
  province,
  country,
  phone,
  email,
  website,
  whatsapp_include_bus_seat,
  whatsapp_include_document_upload,
  whatsapp_include_confirmation_link,
  whatsapp_include_economic_details,
  og_quote_title,
  og_quote_description,
  og_confirmation_title,
  og_confirmation_description,
  travel_conditions
)
SELECT 
  'Gladiatour Viaggi e turismo',
  'Gladiatour di Palmieri Massimo',
  'Via Fonte Peschiera 02',
  'Torrice',
  '03020',
  'FR',
  'Italia',
  '+393207532262',
  'viaggi.gladiatours@gmail.com',
  'www.gladiatour.it',
  true,
  true,
  true,
  true,
  'Preventivo di Viaggio - {DESTINAZIONE}',
  'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}',
  'Conferma Prenotazione - {VIAGGIO}',
  'La tua prenotazione per {VIAGGIO} è confermata!',
  'CANCELLAZIONI E PENALI
In caso di rinuncia da parte del cliente, saranno applicate penali calcolate in base alla data dell''annullamento:

Gite con pernottamento

Dal 30° al 15° giorno prima della partenza: penale pari al 50% della quota.

Dal 14° all''8° giorno prima della partenza: penale pari al 75% della quota.

Negli ultimi 7 giorni prima della partenza: penale pari al 100% della quota.

La penale è calcolata sulla quota totale del pacchetto.

Gite in giornata (1 giorno)

Fino a 10 giorni prima della partenza: penale del 50% del totale.

Negli ultimi 7 giorni: nessun rimborso.

Nota: le percentuali si applicano sull''importo totale del pacchetto acquistato.

Nei viaggi che includono voli o strutture non rimborsabili, saranno trattenuti anche i costi dei biglietti aerei e degli hotel già acquistati. La Direzione si riserva la possibilità di valutare eventuali eccezioni.

Eventuali spese causate da ritardi, scioperi, eventi atmosferici, imprevisti tecnici o calamità naturali non saranno rimborsabili.'
WHERE NOT EXISTS (SELECT 1 FROM public.agency_settings LIMIT 1);
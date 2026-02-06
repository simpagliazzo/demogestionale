# Setup Supabase - Guida Completa

## Paso 1: Creare un Nuovo Progetto Supabase

1. Vai su https://supabase.com
2. Clicca **"Start Your Project"** o accedi al dashboard
3. Crea un nuovo progetto:
   - **Project Name**: `gestionali-viaggi`
   - **Database Password**: Scegli una password sicura
   - **Region**: Europe (preferibilmente)
   - **Plan**: Free

4. Attendi che il progetto sia pronto (2-3 minuti)

## Paso 2: Ottenere le Credenziali API

Una volta creato il progetto:

1. Vai su **Settings** (ingranaggio in basso a sinistra)
2. Clicca su **API**
3. Copia i seguenti valori:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (sotto "Project API keys") → `VITE_SUPABASE_PUBLISHABLE_KEY`

Esempio:
```
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

## Paso 3: Eseguire le Migrazioni SQL

1. Nel dashboard Supabase, vai su **SQL Editor**
2. Clicca **New Query**
3. Copia e incolla il contenuto di: `/supabase/migrations/20260206_01_initial_schema.sql`
4. Clicca **Run** (bottone blu in basso a destra)
5. Ripeti per gli altri file in ordine:
   - `20260206_02_policies_and_functions.sql`
   - `20260206_03_seed_data.sql`
   - `20260206_04_clean_database.sql` (opzionale, per reset)

### Alternativa: Upload automatico
Se il progetto Supabase è stato creato da questo repository, dovrebbe avere un file `supabase/config.toml` che gestisce le migrazioni automaticamente.

## Paso 4: Configurare le Variabili d'Ambiente Locali

1. Crea un file `.env.local` nella root del progetto:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

2. **Salva il file** (git lo ignora automaticamente)

## Paso 5: Testare Localmente

```bash
npm install
npm run dev
```

Visita http://localhost:5173 e verifica che:
- ✓ La login funziona
- ✓ I dati vengono caricati dal database
- ✓ Puoi creare un nuovo viaggio/partecipante

## Paso 6: Deploy su Render

### Opzione A: Deploy Statico (consigliato per Supabase)

1. Vai su https://render.com
2. Crea un nuovo servizio: **Static Site**
3. Connetti GitHub: `https://github.com/simpagliazzo/demogestionale`
4. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Aggiungi Environment Variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```
6. Clicca **Deploy** e attendi 1-2 minuti

### Opzione B: Deploy come Web Service (con server Node.js)

1. Vai su https://render.com
2. Crea un nuovo servizio: **Web Service**
3. Connetti GitHub repository
4. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` (or `npm run dev`)
5. Aggiungi le stesse Environment Variables
6. Deploy

## Paso 7: Verificare il Deploy

1. Una volta pubblicato, Render ti fornisce un URL (es: `https://demogestionale.onrender.com`)
2. Visita l'URL e verifica che l'app funzioni correttamente
3. Testa:
   - ✓ Login
   - ✓ Creazione viaggio
   - ✓ Gestione partecipanti

## Troubleshooting

### Errore: "Could not connect to Supabase"
- Verifica che `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` siano corretti
- Assicurati di aver eseguito tutte le migrazioni SQL

### Errore: "RLS policy violation"
- Le policies potrebbero non essere state applicate correttamente
- Vai su Supabase → Authentication → Users e verifica che l'utente sia autenticato
- Controlla che le policies siano state create nel passo 3

### App carica ma senza dati
- Verifica che le migrazioni SQL siano state eseguite
- Controlla che il database non sia vuoto: Supabase → Table Editor

### Deploy bloccato su Render
- Render potrebbe aver bisogno di più tempo
- Controlla i log: Dashboard → Service → Logs

## Links Utili

- Supabase Dashboard: https://app.supabase.com
- Render Dashboard: https://dashboard.render.com
- Documentazione Supabase: https://supabase.com/docs
- Documentazione Render: https://render.com/docs

---

**Sei bloccato? Contatta il support di Supabase o Render!**

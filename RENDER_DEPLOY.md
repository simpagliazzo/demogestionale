# Deploy Render - Guida Completa

## Paso 1: Creare il Database PostgreSQL su Render

1. Accedi a https://render.com
2. Dashboard → New → PostgreSQL
3. Configura:
   - **Database**: `gestionali-viaggi`
   - **User**: `postgres` (default)
   - **Plan**: Free
   - **Region**: Europe (Frankfurt) oppure Europe (Ireland)
   - **PostgreSQL Version**: 14+

4. Al termine, copia la **Internal Database URL**:
   - Formato: `postgres://user:password@host:5432/database`
   - **SALVA QUESTO URL** (ti servirà dopo)

## Paso 2: Setup Database

### Opzione A: Con pgAdmin (facile)
1. Scarica pgAdmin da https://www.pgadmin.org/download/
2. Avvia pgAdmin
3. Server → Create → Server
   - **Host**: Prendi dall'URL di Render (la parte `host`)
   - **Username**: Prendi dall'URL
   - **Password**: Prendi dall'URL
   - **Port**: 5432

4. Una volta connesso:
   - Clicca su Tools → Query Tool
   - Copia il contenuto di `/supabase/migrations/20260206_01_initial_schema.sql`
   - Incolla e clicca Execute
   - Ripeti per gli altri file SQL in ordine

### Opzione B: Con Node.js (automatico)
```bash
npm install pg

# In Windows PowerShell:
$env:DATABASE_URL = "postgres://user:password@host:5432/database"
node scripts/run-migrations.js

# In Linux/Mac:
DATABASE_URL="postgres://user:password@host:5432/database" node scripts/run-migrations.js
```

## Paso 3: Creare il Web Service su Render

### Per deploy statico (React build):
1. Dashboard → New → Static Site
2. Connetti GitHub:
   - **Repository**: https://github.com/simpagliazzo/demogestionale
3. Configura:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Non servono Environment Variables per versione statica

### Per deploy con backend (consigliato se vuoi API):
1. Dashboard → New → Web Service
2. Connetti GitHub repository
3. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev` (o `npm start`)
   - **Plan**: Free (con limiti)
4. **Environment Variables** (aggiungere):
   ```
   DATABASE_URL=postgres://user:password@host:5432/database
   NODE_ENV=production
   ```

## Paso 4: Aggiustare l'App per PostgreSQL

⚠️ **IMPORTANTE**: L'app attualmente usa Supabase. Hai due opzioni:

### Opzione A: Continuare con Supabase (più facile)
1. Crea un nuovo progetto Free su https://supabase.com
2. Ottieni le chiavi:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Aggiorna le variabili d'ambiente del Web Service
4. Non serve aggiornare il codice, tutto funziona

### Opzione B: Usare PostgreSQL pure (richiede cambi)
Devo creare un backend Node.js che faccia da API layer.

**Quale scegli?** Se scegli B, devo:
- Creare un server Express
- Convertire le query Supabase a query PostgreSQL
- Hostare il backend su Render

## Troubleshooting

### Errore: `listen EADDRNOTAVAIL`
- Render assegna la porta dinamicamente. Usa `process.env.PORT || 3000`

### Errore: `Cannot find module pg`
- Esegui: `npm install pg`

### Database bloccato dopo 90 giorni inattivi (Free Render)
- Render disattiva DB inattivi. Fai un'azione qualche volta al mese

## Checklist Finale

- ✓ Database PostgreSQL creato su Render
- ✓ Migrazioni SQL eseguite
- ✓ Web Service creato su Render
- ✓ Environment variables configurate
- ✓ Deploy completato
- ✓ Verificare che l'app funzioni: visitare l'URL di Render

---

**Hai domande? Scrivi nel progetto GitHub o contatta il support di Render**

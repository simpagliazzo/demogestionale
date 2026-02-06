# Gestionali Viaggi - Setup PostgreSQL su Render

## Opzione 1: Creare un Database PostgreSQL su Render

1. Vai su https://render.com
2. Sign up / Login
3. Crea un nuovo **PostgreSQL Database**:
   - Nome: `gestionali-viaggi-db`
   - Piano: Free
   - Region: Europe (Frankfurt)
   - PostgreSQL Version: 14+

4. Una volta creato, copia la **Internal Database URL** (formato):
   ```
   postgres://user:password@host:5432/database
   ```

## Opzione 2: Usare pgAdmin per gestire il database

1. Vai su https://www.pgadmin.org/
2. Scarica e installa pgAdmin
3. Connettiti al database PostgreSQL di Render
4. Esegui le migrazioni SQL dalla cartella `supabase/migrations/`

## Setup Variabili d'Ambiente

Crea un file `.env.local` con:

```
VITE_DATABASE_URL=postgres://user:password@host:5432/database
VITE_API_URL=http://localhost:5000
VITE_NODE_ENV=development
```

## Esecuzione Migrazioni

### Via pgAdmin (interfaccia grafica):
1. Apri pgAdmin
2. Connettiti al server Render
3. Fai click su Query Tool
4. Copia e incolla il contenuto dei file:
   - `/supabase/migrations/20260206_01_initial_schema.sql`
   - `/supabase/migrations/20260206_02_policies_and_functions.sql`
   - `/supabase/migrations/20260206_03_seed_data.sql`
   - `/supabase/migrations/20260206_04_clean_database.sql`
5. Esegui ogni file in ordine

### Via Node.js (programmatico):
```bash
npm install pg
node scripts/run-migrations.js
```

## Deploy su Render

1. Vai su https://render.com
2. Crea una nuova **Static Site** o **Web Service**
3. Connetti il repo GitHub: `https://github.com/simpagliazzo/demogestionale`
4. Impostazioni:
   - Build command: `npm run build`
   - Start command: `npm run preview` (o un server Express)
   - Environment variables:
     ```
     VITE_DATABASE_URL=<url_dal_db_postgres>
     VITE_NODE_ENV=production
     ```

## Problematiche e Soluzioni

### Problema: L'app continua a usare Supabase
**Soluzione**: Ho creato file alternativi. Devi aggiornare il client:
- Se vuoi mantenere Supabase: Crea un nuovo progetto free su supabase.com
- Se vuoi PostgreSQL pure: Devo creare un backend API Node.js/Express

Quale preferisci?

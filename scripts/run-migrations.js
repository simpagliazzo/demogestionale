#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
});

const migrations = [
  '20260206_01_initial_schema.sql',
  '20260206_02_policies_and_functions.sql',
  '20260206_03_seed_data.sql',
  '20260206_04_clean_database.sql',
];

async function runMigrations() {
  try {
    await client.connect();
    console.log('✓ Connesso al database PostgreSQL');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.warn(`⚠ File non trovato: ${migrationFile}`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      try {
        await client.query(sql);
        console.log(`✓ Eseguita migrazione: ${migrationFile}`);
      } catch (error) {
        console.error(`✗ Errore in ${migrationFile}:`, error.message);
        // Continua con la prossima migrazione
      }
    }

    console.log('✓ Tutte le migrazioni completate');
    await client.end();
  } catch (error) {
    console.error('✗ Errore di connessione:', error.message);
    process.exit(1);
  }
}

runMigrations();

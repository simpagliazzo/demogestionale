-- Rimuovi il constraint CHECK sulla colonna payment_type per permettere valori di testo libero
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
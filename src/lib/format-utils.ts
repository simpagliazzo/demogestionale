import { differenceInDays, parseISO } from "date-fns";

/**
 * Converte un nome completo dal formato "Nome Cognome" a "COGNOME Nome"
 */
export function formatNameSurnameFirst(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].toUpperCase();
  }
  // Assume l'ultimo elemento sia il cognome
  const surname = parts[parts.length - 1].toUpperCase();
  const name = parts.slice(0, -1).join(' ');
  return `${surname} ${name}`;
}

/**
 * Calcola il prezzo effettivo del partecipante considerando lo sconto
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountType: string | null,
  discountAmount: number | null
): number {
  if (!discountType || !discountAmount) return basePrice;
  
  if (discountType === 'percentage') {
    return basePrice - (basePrice * discountAmount / 100);
  }
  // Fixed discount
  return basePrice - discountAmount;
}

/**
 * Calcola il numero di notti tra due date
 * @param departureDate - Data di partenza in formato ISO (YYYY-MM-DD)
 * @param returnDate - Data di ritorno in formato ISO (YYYY-MM-DD)
 * @returns Numero di notti (minimo 1)
 */
export function calculateNights(departureDate: string, returnDate: string): number {
  try {
    const departure = parseISO(departureDate);
    const returnD = parseISO(returnDate);
    const nights = differenceInDays(returnD, departure);
    return Math.max(nights, 1); // Almeno 1 notte
  } catch {
    return 1;
  }
}

/**
 * Calcola il supplemento singola totale basato sulla tariffa giornaliera e le notti
 * @param dailyRate - Tariffa giornaliera del supplemento singola
 * @param departureDate - Data di partenza
 * @param returnDate - Data di ritorno
 * @returns Supplemento totale
 */
export function calculateTotalSingleSupplement(
  dailyRate: number,
  departureDate: string,
  returnDate: string
): number {
  if (!dailyRate || dailyRate <= 0) return 0;
  const nights = calculateNights(departureDate, returnDate);
  return dailyRate * nights;
}

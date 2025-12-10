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

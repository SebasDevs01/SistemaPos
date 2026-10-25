export function formatCOP(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "$ 0";
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCOPNumber(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "0";
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(amount);
}

export default formatCOP;

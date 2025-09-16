/**
 * Currency utility functions for PHP (Philippine Peso) formatting
 */

export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }

  const {
    showSymbol = true,
    decimals = 2,
    locale = 'en-PH'
  } = options;

  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount)) {
    return '₱0.00';
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numericAmount);

  return formatted;
};

export const formatPeso = (amount) => {
  return formatCurrency(amount, { showSymbol: true, decimals: 2 });
};

export const formatPesoNoSymbol = (amount) => {
  return formatCurrency(amount, { showSymbol: false, decimals: 2 });
};

export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Remove currency symbols and commas
  const cleaned = currencyString.replace(/[₱$,]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

export default {
  formatCurrency,
  formatPeso,
  formatPesoNoSymbol,
  parseCurrency
};

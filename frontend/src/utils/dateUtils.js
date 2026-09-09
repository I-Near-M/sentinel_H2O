/**
 * Utilidades para formateo de fechas y horas asegurando conversión de UTC a hora local
 */

export const parseUtcDate = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const str = String(ts).trim();
  // Si el string no incluye 'Z' ni offset '+/-', agregar 'Z' para indicar que viene en UTC
  const iso = !str.endsWith('Z') && !str.includes('+') ? `${str}Z` : str;
  return new Date(iso);
};

export const formatDateTime = (ts) => {
  const date = parseUtcDate(ts);
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export const formatTime = (ts) => {
  const date = parseUtcDate(ts);
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export const formatDate = (ts) => {
  const date = parseUtcDate(ts);
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Utilitarios de validación y sanitización para Sentinel-H2O.
 * Asegura consistencia de reglas de negocio en formularios frontend y sincronización con backend Pydantic.
 */

/**
 * Sanitiza la entrada de un teléfono en tiempo real mientras el usuario escribe:
 * - Permite un '+' solo en la primera posición.
 * - Elimina cualquier carácter que no sea un dígito numérico.
 * - Limita la longitud máxima a 16 caracteres (+ y hasta 15 dígitos).
 */
export function sanitizePhoneInput(value) {
  if (!value) return '';
  let cleaned = value.toString();
  const startsWithPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^0-9]/g, '');
  if (startsWithPlus) {
    cleaned = '+' + cleaned;
  }
  return cleaned.slice(0, 16);
}

/**
 * Sanitiza documentos de identidad (DNI / RUC):
 * - Solo permite dígitos [0-9].
 * - Limita la longitud máxima a 11 dígitos.
 */
export function sanitizeDocInput(value) {
  if (!value) return '';
  return value.toString().replace(/[^0-9]/g, '').slice(0, 11);
}

/**
 * Valida formato y restricciones de número telefónico (móvil Perú / internacional E.164).
 * @param {string} phone 
 * @param {boolean} required 
 * @returns {{ isValid: boolean, error: string | null, formatted: string }}
 */
export function validatePhone(phone, required = false) {
  if (!phone || !phone.trim()) {
    if (required) {
      return { isValid: false, error: 'El número de teléfono es obligatorio.', formatted: '' };
    }
    return { isValid: true, error: null, formatted: '' };
  }

  const cleaned = phone.trim().replace(/[\s\-()]/g, '');

  // Detectar letras o caracteres prohibidos
  if (/[a-zA-Z]/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'El teléfono no puede contener letras ni texto, solo números.', 
      formatted: cleaned 
    };
  }

  if (!/^\+?[0-9]{9,15}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Debe contener entre 9 y 15 dígitos numéricos (ej: 987654321 o +51987654321).', 
      formatted: cleaned 
    };
  }

  let formatted = cleaned;
  if (formatted.length === 9 && formatted.startsWith('9')) {
    formatted = `+51${formatted}`;
  } else if (formatted.length === 11 && formatted.startsWith('519')) {
    formatted = `+${formatted}`;
  }

  return { isValid: true, error: null, formatted };
}

/**
 * Valida formato de correo electrónico.
 * @param {string} email 
 * @param {boolean} required 
 * @returns {{ isValid: boolean, error: string | null, formatted: string }}
 */
export function validateEmail(email, required = false) {
  if (!email || !email.trim()) {
    if (required) {
      return { isValid: false, error: 'El correo electrónico es obligatorio.', formatted: '' };
    }
    return { isValid: true, error: null, formatted: '' };
  }

  const cleaned = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  if (!regex.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Formato de correo electrónico inválido (ejemplo: usuario@dominio.com).', 
      formatted: cleaned 
    };
  }

  return { isValid: true, error: null, formatted: cleaned };
}

/**
 * Valida documentos DNI (8 dígitos) o RUC peruano (11 dígitos).
 * @param {string} doc 
 * @param {boolean} required 
 * @returns {{ isValid: boolean, type: 'DNI'|'RUC'|null, error: string | null }}
 */
export function validateRucDni(doc, required = false) {
  if (!doc || !doc.trim()) {
    if (required) {
      return { isValid: false, type: null, error: 'El DNI o RUC es obligatorio.' };
    }
    return { isValid: true, type: null, error: null };
  }

  const cleaned = doc.trim().replace(/[\s\-]/g, '');

  if (!/^[0-9]+$/.test(cleaned)) {
    return { isValid: false, type: null, error: 'El documento solo debe contener dígitos numéricos.' };
  }

  if (cleaned.length === 8) {
    return { isValid: true, type: 'DNI', error: null };
  }

  if (cleaned.length === 11) {
    const validPrefixes = ['10', '15', '17', '20'];
    const prefix = cleaned.substring(0, 2);
    if (!validPrefixes.includes(prefix)) {
      return { 
        isValid: false, 
        type: 'RUC', 
        error: 'El RUC debe comenzar con 10, 15, 17 o 20.' 
      };
    }
    return { isValid: true, type: 'RUC', error: null };
  }

  return { 
    isValid: false, 
    type: null, 
    error: 'El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).' 
  };
}

/**
 * Evalúa la fortaleza y calidad de una contraseña según políticas de seguridad.
 * @param {string} password 
 * @returns {{
 *   score: number,
 *   label: string,
 *   color: string,
 *   bgColor: string,
 *   isValid: boolean,
 *   criteria: {
 *     length: boolean,
 *     hasUppercase: boolean,
 *     hasLowercase: boolean,
 *     hasNumber: boolean,
 *     hasSpecial: boolean
 *   },
 *   errors: string[]
 * }}
 */
export function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Sin contraseña',
      color: 'text-slate-400',
      bgColor: 'bg-slate-300 dark:bg-slate-700',
      isValid: false,
      criteria: {
        length: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false
      },
      errors: ['Ingrese una contraseña segura.']
    };
  }

  const criteria = {
    length: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_+=[\]\\/`~]/.test(password)
  };

  const errors = [];
  if (!criteria.length) errors.push('Mínimo 8 caracteres.');
  if (!criteria.hasUppercase) errors.push('Al menos 1 mayúscula (A-Z).');
  if (!criteria.hasLowercase) errors.push('Al menos 1 minúscula (a-z).');
  if (!criteria.hasNumber) errors.push('Al menos 1 número (0-9).');
  if (!criteria.hasSpecial) errors.push('Al menos 1 símbolo especial (!@#$%*).');

  let score = 0;
  if (criteria.length) score += 1;
  if (criteria.hasUppercase && criteria.hasLowercase) score += 1;
  if (criteria.hasNumber) score += 1;
  if (criteria.hasSpecial) score += 1;

  let label = 'Muy Débil';
  let color = 'text-rose-500';
  let bgColor = 'bg-rose-500';

  if (score === 2) {
    label = 'Aceptable';
    color = 'text-amber-500';
    bgColor = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Buena';
    color = 'text-cyan-500';
    bgColor = 'bg-cyan-500';
  } else if (score === 4) {
    label = 'Robusta / Segura';
    color = 'text-emerald-500';
    bgColor = 'bg-emerald-500';
  }

  const isValid = score >= 4 && criteria.length;

  return {
    score,
    label,
    color,
    bgColor,
    isValid,
    criteria,
    errors
  };
}

/**
 * Valida coordenadas geográficas y cota msnm para una estación.
 */
export function validateCoordinates(lat, lng, cota) {
  const errors = [];
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  const numCota = parseFloat(cota);

  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    errors.push('La latitud debe estar comprendida entre -90.0 y 90.0.');
  }
  if (isNaN(numLng) || numLng < -180 || numLng > 180) {
    errors.push('La longitud debe estar comprendida entre -180.0 y 180.0.');
  }
  if (!isNaN(numCota) && (numCota < 0 || numCota > 6500)) {
    errors.push('La altitud (cota) debe estar entre 0 y 6,500 msnm.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

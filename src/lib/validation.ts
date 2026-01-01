// ==========================================
// PHONE NUMBER VALIDATION & FORMATTING
// ==========================================

/**
 * Format phone number to international format (+233...)
 * Handles:
 * - +233 XX XXX XXXX (already international)
 * - 233 XX XXX XXXX (missing +)
 * - 0XX XXX XXXX (local Ghana format)
 * - XX XXX XXXX (no prefix)
 */
export function formatPhone(phone: string): string {
  // Remove all spaces, dashes, parentheses, and dots
  const clean = phone.trim().replaceAll(/[\s\-().]/g, '');

  // Already in international format with +233
  if (clean.startsWith('+233')) {
    return clean;
  }

  // Has 233 prefix but missing +
  if (clean.startsWith('233')) {
    return '+' + clean;
  }

  // Local format starting with 0
  if (clean.startsWith('0')) {
    return '+233' + clean.slice(1);
  }

  // Plain number (assume Ghana)
  return '+233' + clean;
}

/**
 * Validate phone number format
 * Returns error message or null if valid
 */
export function validatePhone(phone: string): string | null {
  if (!phone?.trim()) {
    return null; // Phone is optional
  }

  // Remove all formatting
  const clean = phone.trim().replaceAll(/[\s\-().]/g, '');
  
  // Must contain only digits and optional leading +
  if (!/^\+?\d+$/.test(clean)) {
    return "Phone number can only contain digits";
  }

  // Get just the digits
  const digits = clean.replaceAll(/\D/g, '');

  // Check minimum length (Ghana numbers: 10 digits with 0, or 12 with 233)
  if (digits.length < 9) {
    return "Phone number is too short";
  }

  if (digits.length > 15) {
    return "Phone number is too long";
  }

  return null;
}

/**
 * Check if phone number is valid for submission
 */
export function isValidPhone(phone: string): boolean {
  if (!phone?.trim()) return false;
  return validatePhone(phone) === null;
}


// ==========================================
// EMAIL VALIDATION
// ==========================================

/**
 * Validate email format
 * Returns error message or null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email?.trim()) {
    return null; // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address";
  }

  return null;
}

/**
 * Check if email is valid for submission
 */
export function isValidEmail(email: string): boolean {
  if (!email?.trim()) return false;
  return validateEmail(email) === null;
}


// ==========================================
// COMBINED VALIDATION FOR AUTH
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: {
    email?: string;
    phone?: string;
  };
}

/**
 * Validate both email and phone for login/signup
 * Both are required for authentication
 */
export function validateCredentials(email: string, phone: string): ValidationResult {
  const errors: { email?: string; phone?: string } = {};

  // Email is required
  if (email?.trim()) {
    const emailError = validateEmail(email);
    if (emailError) {
      errors.email = emailError;
    }
  } else {
    errors.email = "Email address is required";
  }

  // Phone is required
  if (phone?.trim()) {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      errors.phone = phoneError;
    }
  } else {
    errors.phone = "Phone number is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate for plan creation (at least one contact method)
 */
export function validateContactForPlan(email: string, phone: string): ValidationResult {
  const errors: { email?: string; phone?: string } = {};

  // At least one is required for notifications
  const hasEmail = email?.trim();
  const hasPhone = phone?.trim();

  if (hasEmail) {
    const emailError = validateEmail(email);
    if (emailError) {
      errors.email = emailError;
    }
  }

  if (hasPhone) {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      errors.phone = phoneError;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

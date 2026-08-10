import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordPolicyResult {
  min8: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

/** Reglas mostradas en la UI; cada una se evalúa en tiempo real. */
export const PASSWORD_RULES: ReadonlyArray<{ key: keyof PasswordPolicyResult; label: string }> = [
  { key: 'min8', label: 'Al menos 8 caracteres' },
  { key: 'lower', label: 'Al menos una letra minúscula' },
  { key: 'upper', label: 'Al menos una letra mayúscula' },
  { key: 'number', label: 'Al menos un número' },
  { key: 'symbol', label: 'Al menos un símbolo especial' }
];

/** Evalúa cada requisito de la política de contraseña de forma independiente. */
export function evaluatePasswordPolicy(value: string): PasswordPolicyResult {
  return {
    min8: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value)
  };
}

export interface PasswordRule {
  key: keyof PasswordPolicyResult;
  label: string;
  ok: boolean;
}

/** Devuelve la lista de requisitos con su estado para pintar el checklist. */
export function passwordRules(value: string): PasswordRule[] {
  const result = evaluatePasswordPolicy(value);
  return PASSWORD_RULES.map((rule) => ({ ...rule, ok: result[rule.key] }));
}

/**
 * ValidatorFn de la política de contraseña segura: mínimo 8 caracteres, al
 * menos una mayúscula, una minúscula, un número y un símbolo especial.
 * Devuelve null si el campo está vacío (el required se encarga de eso).
 */
export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) {
      return null;
    }
    const result = evaluatePasswordPolicy(value);
    const valid = result.min8 && result.upper && result.lower && result.number && result.symbol;
    return valid ? null : { weakPassword: true };
  };
}
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * ValidatorFn a nivel de grupo: invalida el formulario cuando el valor del
 * campo "firstKey" no coincide con el de "secondKey" (ambos no vacíos).
 */
export function mustMatchValidator(firstKey: string, secondKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const first: string | null | undefined = group.get(firstKey)?.value;
    const second: string | null | undefined = group.get(secondKey)?.value;
    if (first && second && first !== second) {
      return { mustMatch: true };
    }
    return null;
  };
}
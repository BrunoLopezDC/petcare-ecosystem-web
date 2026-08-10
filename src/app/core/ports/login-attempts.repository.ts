import { Observable } from 'rxjs';

/**
 * Puerto para la tabla login_attempts (Fase A). Control del lado del cliente:
 * antes de intentar autenticar se cuentan los fallos recientes del email y,
 * después de cada intento, se registra el resultado.
 */
export interface LoginAttemptsRepository {
  /**
   * Cuenta los intentos fallidos de un email con attempted_at >= sinceIso.
   * Este método se ejecuta SIN sesión (desde la pantalla de login), por lo
   * que la tabla debe permitir lectura con la anon key.
   */
  countRecentFailures(email: string, sinceIso: string): Observable<number>;

  /**
   * Registra un intento (éxito o fallo) para un email. Best-effort: si el
   * insert falla solo se registra en consola, el login continúa.
   */
  recordAttempt(email: string, success: boolean): Observable<void>;
}
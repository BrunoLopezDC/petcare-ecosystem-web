import { Injectable } from '@angular/core';

/**
 * Captura best-effort de la IP pública del navegador para los registros de
 * auditoría de tipo login. Limitación documentada: depende de un servicio
 * externo (api.ipify.org); si el fetch falla, tarda más de 2s o el entorno
 * bloquea peticiones cross-origin, devuelve null y el registro de auditoría
 * se guarda igualmente sin IP. Nunca debe bloquear el flujo de login.
 */
@Injectable({ providedIn: 'root' })
export class ClientIpService {
  private static readonly TIMEOUT_MS = 2000;

  async getPublicIp(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ClientIpService.TIMEOUT_MS);
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { ip?: string };
      return typeof body.ip === 'string' && body.ip ? body.ip : null;
    } catch (error) {
      console.warn('[audit] No se pudo obtener la IP pública:', error);
      return null;
    }
  }
}
import { Signal, signal } from '@angular/core';

export type SeveridadAlerta = 'alta' | 'media' | 'info';

export interface Alerta {
  id: string;
  titulo: string;
  detalle: string;
  severidad: SeveridadAlerta;
  ruta?: string;
  queryParams?: Record<string, string | number>;
}

// Cada categoría del menú tiene un archivo `alertas-<slug>.ts` que exporta una
// fábrica con este formato. Se invoca una sola vez dentro de un contexto de
// inyección (por eso puede usar `inject()`), y `alertas` es una señal derivada
// de los servicios de ese módulo.
export interface ProveedorAlertas {
  alertas: Signal<Alerta[]>;
  // Trae los datos necesarios al entrar al módulo (solo se llama en el navegador).
  cargar: () => void;
}

export type FabricaAlertas = () => ProveedorAlertas;

// Categoría sin alertas implementadas todavía.
export const SIN_ALERTAS: FabricaAlertas = () => ({
  alertas: signal<Alerta[]>([]).asReadonly(),
  cargar: () => undefined,
});

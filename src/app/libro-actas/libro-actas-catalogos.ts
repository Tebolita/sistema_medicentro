// Mock del personal de recepción que puede atender un ingreso. No existe
// todavía un endpoint de "empleados de recepción" expuesto; se reemplaza
// por la llamada real cuando exista (ver Fundamentos: empleados/puestos).

export interface Recepcionista {
  id: number;
  nombre: string;
}

export const RECEPCIONISTAS: Recepcionista[] = [
  { id: 1, nombre: 'Ana Lucía Morán' },
  { id: 2, nombre: 'Carlos Ixchop' },
  { id: 3, nombre: 'Mirna Xitumul' },
];

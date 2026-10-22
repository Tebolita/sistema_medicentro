import { OperatorFunction, catchError, of } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// Para listas AUXILIARES dentro de un forkJoin (p. ej. pacientes dados de
// baja, solo para poder mostrar el nombre en registros viejos): si la
// petición falla se sigue con la lista vacía en vez de tumbar toda la carga.
//
// Caso típico: los endpoints /eliminados son solo para ADMIN (MatrizAcceso
// en el backend) y a cualquier otro rol le responden 403 — sin esto, una
// recepcionista no podría abrir pantallas que no tienen nada que ver con
// lo eliminado.
export function listaOpcional<T>(): OperatorFunction<ApiResponse<T[]>, ApiResponse<T[]>> {
  return catchError(() => of({ exito: true, mensaje: '', datos: [], errores: null } as ApiResponse<T[]>));
}

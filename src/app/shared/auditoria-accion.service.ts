import { Injectable, inject } from '@angular/core';
import { CatalogosService } from '../service/catalogos.service';
import { accionClasePorCodigo, accionIconoPorCodigo, accionLabelPorCodigo } from './auditoria-accion.util';

const TIPO_ACCION_AUDITORIA = 'TIPO_ACCION_AUDITORIA';

// Resuelve label/clase/ícono de una acción de bitácora (Creó/Modificó/
// Eliminó) a partir de su código real en vez de un id quemado (79/80/81),
// que es un id_valor_catalogo y cambia en cada base de datos. Centralizado
// acá porque los ~55 formularios y listas con historial de auditoría
// repetían la misma comparación por id.
@Injectable({ providedIn: 'root' })
export class AuditoriaAccionService {
  private catalogos = inject(CatalogosService);

  label(idTipoAccion: number): string {
    return accionLabelPorCodigo(this.catalogos.codigoPorId(TIPO_ACCION_AUDITORIA, idTipoAccion));
  }

  clase(idTipoAccion: number): string {
    return accionClasePorCodigo(this.catalogos.codigoPorId(TIPO_ACCION_AUDITORIA, idTipoAccion));
  }

  icono(idTipoAccion: number): string {
    return accionIconoPorCodigo(this.catalogos.codigoPorId(TIPO_ACCION_AUDITORIA, idTipoAccion));
  }
}

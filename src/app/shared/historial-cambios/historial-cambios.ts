import { Component, computed, inject, input } from '@angular/core';
import { PermisosService } from '../../service/permisos.service';
import { RolesService } from '../../service/roles.service';
import { UsuariosService } from '../../service/usuarios.service';
import { FilaBitacora, cambiosBitacora } from '../bitacora-cambios';

// Tabla "Campo / Antes / Después" de una fila de bitácora, para los modales
// de "Historial general" de Mantenimiento (los formularios de cada registro
// ya arman la suya con sus propios nombres de campo).
@Component({
  selector: 'app-historial-cambios',
  template: `
    @if (cambios().length > 0) {
      <table class="historial-cambios">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Antes</th>
            <th>Después</th>
          </tr>
        </thead>
        <tbody>
          @for (c of cambios(); track c.campo) {
            <tr>
              <td class="campo">{{ c.campo }}</td>
              <td class="antes">{{ c.antes }}</td>
              <td class="despues">{{ c.despues }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: 8px;
    }

    .historial-cambios {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      background: var(--c-surface);
      border-radius: 8px;
      overflow: hidden;
    }

    .historial-cambios thead th {
      text-align: left;
      padding: 6px 10px;
      background: var(--c-bg);
      color: var(--c-text-muted);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .historial-cambios td {
      padding: 6px 10px;
      border-top: 1px solid var(--c-border);
      vertical-align: top;
      word-break: break-word;
    }

    .campo {
      color: var(--c-text-muted);
      font-weight: 500;
    }

    .antes {
      color: color-mix(in srgb, #c62828 var(--c-keep), white);
    }

    .despues {
      color: #2e7d32;
      font-weight: 500;
    }
  `,
})
export class HistorialCambios {
  private permisosService = inject(PermisosService);
  private rolesService = inject(RolesService);
  private usuariosService = inject(UsuariosService);

  item = input.required<FilaBitacora>();

  cambios = computed(() =>
    cambiosBitacora(this.item(), {
      permiso: (id) => this.permisosService.obtener(id)?.nombre,
      rol: (id) => this.rolesService.obtener(id)?.nombre,
      usuario: (id) => this.usuariosService.obtener(id)?.nombreUsuario,
    }),
  );
}

import { Component, afterNextRender, computed, inject, input } from '@angular/core';
import { UsuariosService } from '../../service/usuarios.service';

// "Creado el ... por ... · Modificado el ... por ..." — se usa en los
// formularios de edición de Mantenimiento. Se arma solo con lo que el DTO
// de ese recurso alcance a dar: si idUsuarioCreacion/idUsuarioModificacion
// vienen null (dato viejo, de antes de que el backend empezara a llenarlos,
// o un recurso que todavía no los expone), esa parte simplemente no se
// muestra en vez de decir "por usuario #null".
@Component({
  selector: 'app-auditoria-info',
  template: `
    @if (texto()) {
      <p class="auditoria-info">{{ texto() }}</p>
    }
  `,
  styles: [
    `
      .auditoria-info {
        margin: 0;
        font-size: 12px;
        color: var(--c-text-soft);
      }
    `,
  ],
})
export class AuditoriaInfo {
  private usuariosService = inject(UsuariosService);

  fechaCreacion = input<string | null>(null);
  idUsuarioCreacion = input<number | null>(null);
  fechaModificacion = input<string | null>(null);
  idUsuarioModificacion = input<number | null>(null);

  constructor() {
    afterNextRender(() => this.usuariosService.cargar());
  }

  private nombreUsuario(id: number | null): string | null {
    if (id == null) {
      return null;
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `usuario #${id}`;
  }

  private formatear(fecha: string | null, idUsuario: number | null): string | null {
    if (!fecha) {
      return null;
    }
    const f = new Date(fecha).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
    const quien = this.nombreUsuario(idUsuario);
    return quien ? `${f} por ${quien}` : f;
  }

  private creado = computed(() => this.formatear(this.fechaCreacion(), this.idUsuarioCreacion()));
  private modificado = computed(() => this.formatear(this.fechaModificacion(), this.idUsuarioModificacion()));

  texto = computed(() => {
    const partes: string[] = [];
    if (this.creado()) {
      partes.push(`Creado el ${this.creado()}`);
    }
    if (this.modificado()) {
      partes.push(`Modificado el ${this.modificado()}`);
    }
    return partes.length ? partes.join(' · ') : null;
  });
}

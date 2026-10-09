import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermisosService } from '../../service/permisos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { MODULOS_SISTEMA } from '../permisos-catalogos';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-permisos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './permisos-lista.html',
  styleUrl: './permisos-lista.css',
})
export class PermisosLista {
  private permisosService = inject(PermisosService);

  private catalogos = inject(CatalogosService);
  private modulosApi = this.catalogos.obtener('MODULO_SISTEMA');
  private modulos = computed(() => {
    const api = this.modulosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : MODULOS_SISTEMA;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.permisosService.cargandoEliminados;
  errorEliminados = this.permisosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.permisosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.permisosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.permisosService.listarEliminados().length) {
      this.permisosService.cargarEliminados();
    }
  }

  permisos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.permisosService.listar() : this.permisosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((p) => [p.nombre, p.codigo].join(' ').toLowerCase().includes(term));
  });

  moduloLabel(idModulo: number): string {
    return this.modulos().find((m) => m.id === idModulo)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el permiso "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.permisosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar el permiso "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.permisosService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

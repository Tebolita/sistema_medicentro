import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TiposExamenService } from '../../service/tipos-examen.service';
import { CatalogosService } from '../../service/catalogos.service';
import { CATEGORIAS_EXAMEN } from '../../laboratorio/laboratorio-catalogos';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-tipos-examen-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './tipos-examen-lista.html',
  styleUrl: './tipos-examen-lista.css',
})
export class TiposExamenLista {
  private tiposService = inject(TiposExamenService);

  private catalogos = inject(CatalogosService);
  private categoriasApi = this.catalogos.obtener('CATEGORIA_EXAMEN');
  private categorias = computed(() => {
    const api = this.categoriasApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : CATEGORIAS_EXAMEN;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.tiposService.cargandoEliminados;
  errorEliminados = this.tiposService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.tiposService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.tiposService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.tiposService.listarEliminados().length) {
      this.tiposService.cargarEliminados();
    }
  }

  tipos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.tiposService.listar() : this.tiposService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((t) => t.nombre.toLowerCase().includes(term));
  });

  categoriaLabel(idCategoriaExamen: number): string {
    return this.categorias().find((c) => c.id === idCategoriaExamen)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el tipo de examen "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.tiposService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar el tipo de examen "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.tiposService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

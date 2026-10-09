import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MedicamentosService } from '../../service/medicamentos.service';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { UsuariosService } from '../../service/usuarios.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-medicamentos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './medicamentos-lista.html',
  styleUrl: './medicamentos-lista.css',
})
export class MedicamentosLista {
  private medicamentosService = inject(MedicamentosService);
  private inventarioService = inject(InventarioFarmaciaService);
  private usuariosService = inject(UsuariosService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.medicamentosService.cargandoEliminados;
  errorEliminados = this.medicamentosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.medicamentosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.medicamentosService.errorCarga() : this.errorEliminados()));

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.medicamentosService.cargar();
      this.inventarioService.cargar();
    });
  }

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    // Se pide la primera vez que se entra a la pestaña, no en cada clic.
    if (!this.medicamentosService.listarEliminados().length) {
      this.medicamentosService.cargarEliminados();
    }
  }

  medicamentos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.medicamentosService.listar() : this.medicamentosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((m) =>
      [m.nombre, m.principioActivo, m.presentacion].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  // Stock de inventario todavía ligado a este medicamento (para avisar antes
  // de dar de baja). Un medicamento puede tener más de un item de inventario
  // (distintas presentaciones/proveedores), así que se suma todo.
  private stockVinculado(idMedicamento: number): { total: number; items: string[] } {
    const items = this.inventarioService
      .listar()
      .filter((i) => i.idMedicamento === idMedicamento && i.stockActual > 0);
    return { total: items.reduce((suma, i) => suma + i.stockActual, 0), items: items.map((i) => i.nombre) };
  }

  eliminar(id: number, nombre: string): void {
    const { total, items } = this.stockVinculado(id);
    const mensaje =
      total > 0
        ? `"${nombre}" todavía tiene ${total} unidades en inventario (${items.join(', ')}).\n\n` +
          `Si lo das de baja, seguirá apareciendo en ese inventario pero ya no se podrá recetar ni agregar a nuevos items.\n\n` +
          `¿Seguro que deseas darlo de baja de todos modos?`
        : `¿Dar de baja el medicamento "${nombre}"?`;

    if (!confirm(mensaje)) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // El backend expone "idUsuarioCreacion"/"idUsuarioModificacion" en el
  // medicamento, pero todavía no los llena con el usuario real que hizo la
  // acción (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5): hasta que eso se
  // arregle del lado del backend, esto va a mostrar "—" casi siempre.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar el medicamento "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

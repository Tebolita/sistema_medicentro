import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmpleadosService } from '../../service/empleados.service';
import { PuestosService } from '../../service/puestos.service';
import { ESTADOS_EMPLEADO } from '../empleados-catalogos';
import { CatalogosService } from '../../service/catalogos.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-empleados-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './empleados-lista.html',
  styleUrl: './empleados-lista.css',
})
export class EmpleadosLista {
  private empleadosService = inject(EmpleadosService);
  private puestosService = inject(PuestosService);

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_EMPLEADO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_EMPLEADO;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.empleadosService.cargandoEliminados;
  errorEliminados = this.empleadosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.empleadosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.empleadosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.empleadosService.listarEliminados().length) {
      this.empleadosService.cargarEliminados();
    }
  }

  empleados = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.empleadosService.listar() : this.empleadosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((e) =>
      [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido, e.correo, e.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombreCompleto(idEmpleado: number): string {
    return this.empleadosService.nombreCompleto(idEmpleado);
  }

  puestoLabel(idPuesto: number): string {
    return this.puestosService.obtener(idPuesto)?.nombre ?? '—';
  }

  estadoLabel(idEstadoEmpleado: number): string {
    return this.estados().find((e) => e.id === idEstadoEmpleado)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al empleado "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar al empleado "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

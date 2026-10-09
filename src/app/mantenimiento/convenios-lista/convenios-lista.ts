import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConveniosService } from '../../service/convenios.service';
import { AseguradorasService } from '../../service/aseguradoras.service';

@Component({
  selector: 'app-convenios-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './convenios-lista.html',
  styleUrl: './convenios-lista.css',
})
export class ConveniosLista {
  private conveniosService = inject(ConveniosService);
  private aseguradorasService = inject(AseguradorasService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.conveniosService.cargando;
  errorCarga = this.conveniosService.errorCarga;

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.conveniosService.cargar();
      this.aseguradorasService.cargar();
    });
  }

  convenios = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.conveniosService.listarTodos();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [c.nombreConvenio, this.aseguradoraLabel(c.idAseguradora)].join(' ').toLowerCase().includes(term),
    );
  });

  aseguradoraLabel(idAseguradora: number): string {
    return this.aseguradorasService.listar().find((a) => a.idAseguradora === idAseguradora)?.nombre ?? '—';
  }

  formatFecha(fecha: string | null | undefined): string {
    // Defensivo: no debería faltar (fechaInicio es obligatoria en el
    // backend), pero si llegara null/undefined no tiene sentido tronar la
    // pantalla completa por una fecha que no se puede mostrar.
    if (!fecha) {
      return '—';
    }
    // fechaInicio/fechaFin son DateOnly ("yyyy-MM-dd"): si se arman con
    // `new Date('yyyy-MM-dd')` se interpretan en UTC y en husos horarios
    // negativos (como Guatemala) se corren un día hacia atrás. Se arman en
    // hora local para evitar eso.
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el convenio "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.conveniosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

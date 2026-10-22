import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CatalogoValor, CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { TIPOS_CATALOGO_CONOCIDOS, TipoCatalogoConocido } from '../mantenimiento-catalogos';
import { TipoCatalogoDialog } from '../tipo-catalogo-dialog/tipo-catalogo-dialog';
import { ValorCatalogoDialog } from '../valor-catalogo-dialog/valor-catalogo-dialog';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

// Una fila de la grilla, enriquecida con el ícono curado (si lo conocemos)
// y el módulo real que manda el backend en cat_tipo_catalogo.codigo_modulo.
interface CatalogoFila extends TipoCatalogoConocido {
  codigoModulo: string | null;
}

@Component({
  selector: 'app-catalogos-lista',
  imports: [
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
  ],
  templateUrl: './catalogos-lista.html',
  styleUrl: './catalogos-lista.css',
})
export class CatalogosLista {
  private catalogosService = inject(CatalogosService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  constructor() {
    // CatalogosService (como el resto de servicios "singleton" de la app)
    // solo pide los datos UNA vez, al construirse — si esa primera carga
    // pasó antes de que el backend tuviera los campos nuevos (o antes de
    // reiniciarlo), esta pantalla se queda viendo esa foto vieja hasta que
    // alguien la fuerce a pedir de nuevo. Se hace acá, cada vez que se entra.
    afterNextRender(() => {
      this.usuariosService.cargar();
      this.catalogosService.recargarTodos();
    });
  }

  // El backend ya tiene GET /api/catalogos (lista TODOS los que existen en
  // la base, con sus valores y su módulo real en codigoModulo). Esa es la
  // fuente de verdad; la lista curada de este archivo solo aporta un ícono
  // más específico para los que ya conocemos, cuando el código coincide.
  // Si el backend no respondiera por algún motivo, se cae a la lista
  // curada (sin módulo) para no dejar la pantalla vacía.
  tiposConocidos = computed<CatalogoFila[]>(() => {
    const delBackend = this.catalogosService.tiposDesdeBackend();
    if (!delBackend.length) {
      return TIPOS_CATALOGO_CONOCIDOS.map((c) => ({ ...c, codigoModulo: null }));
    }
    return delBackend.map((t) => {
      const curado = TIPOS_CATALOGO_CONOCIDOS.find((c) => c.codigo === t.codigo);
      return { codigo: t.codigo, nombre: t.nombre, icono: curado?.icono ?? 'tune', codigoModulo: t.codigoModulo };
    });
  });
  errorAccion = signal('');

  // Buscador global: filtra las tarjetas de catálogo por nombre o código.
  buscar = signal('');

  // Filtro por módulo (código de MODULO_SISTEMA, o null = todos).
  moduloFiltro = signal<string | null>(null);

  private modulosApi = this.catalogosService.obtener('MODULO_SISTEMA');

  // Solo los módulos que de verdad tienen al menos un catálogo asignado,
  // para no mostrar opciones vacías en el filtro.
  modulosDisponibles = computed(() => {
    const usados = new Set(this.tiposConocidos().map((t) => t.codigoModulo).filter((c): c is string => c != null));
    return this.modulosApi()
      .filter((m) => usados.has(m.codigo))
      .map((m) => ({ codigo: m.codigo, nombre: m.nombre }));
  });

  catalogosFiltrados = computed(() => {
    const todos = this.tiposConocidos();
    const term = this.buscar().trim().toLowerCase();
    const modulo = this.moduloFiltro();
    return todos.filter((t) => {
      const coincideTexto = !term || t.nombre.toLowerCase().includes(term) || t.codigo.toLowerCase().includes(term);
      const coincideModulo = !modulo || t.codigoModulo === modulo;
      return coincideTexto && coincideModulo;
    });
  });

  // Color de fondo del ícono de cada tarjeta: "aleatorio" pero estable a
  // partir del código del catálogo, para que no cambie de color en cada
  // render. Saturación e iluminación fijas y moderadas para que no se vea
  // chillón.
  colorDe(codigo: string): string {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) {
      hash = (hash * 31 + codigo.charCodeAt(i)) % 360;
    }
    return `hsl(${hash}, 45%, 45%)`;
  }

  // Nombre del módulo para mostrar como badge (null si el catálogo no
  // tiene módulo asignado todavía).
  nombreModulo(codigoModulo: string | null): string | null {
    if (!codigoModulo) {
      return null;
    }
    return this.modulosApi().find((m) => m.codigo === codigoModulo)?.nombre ?? codigoModulo;
  }

  tipoSeleccionado = signal<string | null>(null);

  valores = computed(() => {
    const codigo = this.tipoSeleccionado();
    return codigo ? this.catalogosService.obtener(codigo)() : [];
  });

  catalogoActual = computed<CatalogoFila | null>(() => {
    const codigo = this.tipoSeleccionado();
    if (!codigo) {
      return null;
    }
    return (
      this.tiposConocidos().find((t) => t.codigo === codigo) ?? { codigo, nombre: codigo, icono: 'tune', codigoModulo: null }
    );
  });

  seleccionarTipo(codigo: string): void {
    this.tipoSeleccionado.set(codigo);
    this.catalogosService.recargar(codigo);
  }

  volverACatalogos(): void {
    this.tipoSeleccionado.set(null);
  }

  abrirNuevoCatalogo(): void {
    this.dialog
      .open(TipoCatalogoDialog, { autoFocus: false })
      .afterClosed()
      .subscribe((creado: boolean) => {
        if (creado) {
          // El popup ya hizo que el servicio recargara la lista completa;
          // solo falta limpiar el buscador para que la tarjeta nueva se
          // vea de inmediato.
          this.buscar.set('');
        }
      });
  }

  editarCatalogo(): void {
    const codigo = this.tipoSeleccionado();
    const tipo = this.catalogosService.tiposDesdeBackend().find((t) => t.codigo === codigo);
    if (!tipo) {
      return;
    }
    this.dialog.open(TipoCatalogoDialog, { autoFocus: false, data: { tipo } });
  }

  nuevoValor(): void {
    const codigoTipo = this.tipoSeleccionado();
    if (!codigoTipo) {
      return;
    }
    this.dialog.open(ValorCatalogoDialog, {
      autoFocus: false,
      data: {
        codigoTipo,
        nombreTipo: this.catalogoActual()?.nombre ?? codigoTipo,
        siguienteOrden: this.valores().length + 1,
      },
    });
  }

  // Vista rápida: si la descripción es larga, se corta a 12 caracteres y se
  // avisa con "…" — el texto completo queda en el tooltip (title) del span.
  truncar(texto: string): string {
    return texto.length > 12 ? `${texto.slice(0, 12)}…` : texto;
  }

  private nombreUsuario(id: number): string {
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `#${id}`;
  }

  // Versión corta para la tarjeta (poco espacio): solo "por fulano",
  // priorizando quién modificó por última vez y cayendo a quién lo creó si
  // nunca se modificó. El detalle completo (fechas de creación y
  // modificación) va en el tooltip — ver autorTooltip().
  autorResumen(v: CatalogoValor): string | null {
    const id = v.idUsuarioModificacion ?? v.idUsuarioCreacion;
    return id != null ? `por ${this.nombreUsuario(id)}` : null;
  }

  autorTooltip(v: CatalogoValor): string {
    const partes: string[] = [];
    if (v.idUsuarioCreacion != null) {
      partes.push(`Creado por ${this.nombreUsuario(v.idUsuarioCreacion)}`);
    }
    if (v.idUsuarioModificacion != null) {
      partes.push(`Modificado por ${this.nombreUsuario(v.idUsuarioModificacion)}`);
    }
    return partes.join(' · ');
  }

  editarValor(idValor: number): void {
    const codigoTipo = this.tipoSeleccionado();
    const valor = this.valores().find((v) => v.id === idValor);
    if (!codigoTipo || !valor) {
      return;
    }
    this.dialog.open(ValorCatalogoDialog, {
      autoFocus: false,
      data: {
        codigoTipo,
        nombreTipo: this.catalogoActual()?.nombre ?? codigoTipo,
        valor,
        siguienteOrden: valor.orden,
      },
    });
  }

  async eliminarValor(idValor: number, nombre: string): Promise<void> {
    const codigoTipo = this.tipoSeleccionado();
    if (!codigoTipo) {
      return;
    }
    // El backend no tiene forma de reactivar un valor dado de baja (el GET
    // solo trae los activos): aviso explícito de que no es reversible acá.
    if (!(await this.confirmacion.confirmar(`¿Dar de baja el valor "${nombre}"? No se puede deshacer desde esta pantalla.`))) {
      return;
    }
    this.errorAccion.set('');
    this.catalogosService.eliminarValor(codigoTipo, idValor).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}

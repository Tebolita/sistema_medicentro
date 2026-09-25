import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { AlertasService } from '../alertas/alertas.service';
import { TemaService } from '../service/tema.service';

@Component({
  selector: 'app-header',
  imports: [
    DatePipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  now = signal(new Date());
  selectedDate = new Date();

  private temaService = inject(TemaService);
  oscuro = this.temaService.oscuro;
  alternarTema(): void {
    this.temaService.alternar();
  }

  private alertasService = inject(AlertasService);
  alertas = this.alertasService.alertas;
  moduloActual = this.alertasService.moduloActual;
  // El globo muestra hasta 99; de ahí en adelante "99+".
  contadorAlertas = computed(() => {
    const total = this.alertas().length;
    return total > 99 ? '99+' : String(total);
  });

  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.intervalId = setInterval(() => this.now.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cerrarSesion(): void {
    console.log('Cerrando sesión...');
  }
}

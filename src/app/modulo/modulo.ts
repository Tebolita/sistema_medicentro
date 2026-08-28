import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MENU_SECTIONS } from '../shared/menu-data';

@Component({
  selector: 'app-modulo',
  imports: [MatIconModule],
  templateUrl: './modulo.html',
  styleUrl: './modulo.css',
})
export class Modulo {
  private route = inject(ActivatedRoute);

  private slug = signal('');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.slug.set(params.get('slug') ?? '');
    });
  }

  section = computed(() => MENU_SECTIONS.find((s) => s.slug === this.slug()) ?? null);
}

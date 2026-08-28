import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MENU_SECTIONS } from '../shared/menu-data';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatIconModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  sections = MENU_SECTIONS;
}

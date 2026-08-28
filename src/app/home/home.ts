import {Component, signal} from '@angular/core';
import {MatSidenavModule} from '@angular/material/sidenav';
import {Menu} from '../menu/menu';
import {Header} from '../header/header';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [MatSidenavModule, Menu, Header, RouterOutlet],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  menuCollapsed = signal(false);
}

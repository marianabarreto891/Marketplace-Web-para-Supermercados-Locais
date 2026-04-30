import { Component } from '@angular/core';
import { NavbarComponent } from './features/layout/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent],
  templateUrl: './app.html'
})
export class AppComponent {}
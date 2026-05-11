import { Component, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './features/layout/navbar/navbar.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  templateUrl: './app.html'
})
export class AppComponent {
  private readonly hideNavbarRoutes = ['/login', '/register'];

  private currentUrl: any;

  showNavbar = computed(() => {
    const url = this.currentUrl() ?? '';
    return !this.hideNavbarRoutes.some(route => url.startsWith(route));
  });

  constructor(private router: Router) {
    this.currentUrl = toSignal(
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        map(e => (e as NavigationEnd).urlAfterRedirects)
      ),
      { initialValue: this.router.url }
    );
  }
}
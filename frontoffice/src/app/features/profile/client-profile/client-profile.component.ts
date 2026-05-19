import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../layout/page-header/page-header.component';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './client-profile.component.html',
})
export class ClientProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly profile = signal<User | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.profile.set(user);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.error ||
            error?.error?.message ||
            'Nao foi possivel carregar o perfil.'
        );
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }
}

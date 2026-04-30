import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  name = ''; email = ''; password = ''; address = ''; phone = '';
  error = ''; success = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.auth.register({
      name: this.name,
      email: this.email,
      password: this.password,
      address: this.address,
      phone: this.phone
    }).subscribe({
      next: () => {
        this.success = 'Conta criada! A redirecionar...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: err => this.error = err.error?.error || 'Erro ao registar'
    });
  }
}
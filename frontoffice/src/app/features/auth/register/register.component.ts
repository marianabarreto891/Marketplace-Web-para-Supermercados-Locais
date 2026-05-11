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
  fieldErrors: {
    name?: string;
    email?: string;
    password?: string;
    address?: string;
    phone?: string;
  } = {};

  constructor(private auth: AuthService, private router: Router) {}

  private validate(): boolean {
    this.fieldErrors = {};

    if (!this.name.trim()) {
      this.fieldErrors.name = 'O nome é obrigatório.';
    } else if (this.name.trim().length < 2) {
      this.fieldErrors.name = 'O nome deve ter pelo menos 2 caracteres.';
    }

    if (!this.email.trim()) {
      this.fieldErrors.email = 'O email é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.fieldErrors.email = 'Introduz um email válido (ex: nome@dominio.com).';
    }

    if (!this.password) {
      this.fieldErrors.password = 'A password é obrigatória.';
    } else if (this.password.length < 6) {
      this.fieldErrors.password = 'A password deve ter pelo menos 6 caracteres.';
    }

    if (!this.address.trim()) {
      this.fieldErrors.address = 'A morada é obrigatória.';
    }

    if (!this.phone.trim()) {
      this.fieldErrors.phone = 'O telefone é obrigatório.';
    } else if (!/^\d{9}$/.test(this.phone.trim())) {
      this.fieldErrors.phone = 'O telefone deve ter exatamente 9 dígitos (ex: 912345678).';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  onSubmit() {
    this.error = '';
    this.success = '';
    if (!this.validate()) return;

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
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  fieldErrors: { email?: string; password?: string } = {};

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  private validate(): boolean {
    this.fieldErrors = {};

    if (!this.email.trim()) {
      this.fieldErrors.email = 'O email é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.fieldErrors.email = 'Introduz um email válido (ex: nome@dominio.com).';
    }

    if (!this.password) {
      this.fieldErrors.password = 'A password é obrigatória.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  onSubmit() {
    this.error = '';
    if (!this.validate()) return;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/products';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => this.error = err.error?.error || 'Erro ao fazer login'
    });
  }
}

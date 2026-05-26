import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, Product } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-compare.component.html'
})
export class ProductCompareComponent {
  searchName = '';
  results = signal<Product[]>([]);
  loading = signal(false);
  searched = signal(false);
  errorMessage = signal('');

  constructor(private productService: ProductService) {}

  compare() {
    const normalizedSearch = this.searchName.trim();

    if (!normalizedSearch) {
      return;
    }

    if (normalizedSearch.length < 3) {
      this.searched.set(false);
      this.results.set([]);
      this.errorMessage.set('Escreve pelo menos 3 letras para comparar produtos.');
      return;
    }

    this.searchName = normalizedSearch;
    this.loading.set(true);
    this.searched.set(true);
    this.errorMessage.set('');
    this.productService.compareByName(normalizedSearch).subscribe({
      next: r => {
        this.results.set(Array.isArray(r) ? r : []);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
        this.errorMessage.set('Nao foi possivel comparar os produtos.');
      }
    });
  }

  cheapest(): Product | null {
    return this.results().length ? this.results()[0] : null;
  }

  distinctProductNames(): string[] {
    return [...new Set(this.results().map(product => product.name.trim()).filter(Boolean))];
  }

  hasMultipleProducts(): boolean {
    return this.distinctProductNames().length > 1;
  }
}

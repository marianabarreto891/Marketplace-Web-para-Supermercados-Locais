import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-compare',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    if (!this.searchName.trim()) return;
    this.loading.set(true);
    this.searched.set(true);
    this.errorMessage.set('');
    this.productService.compareByName(this.searchName).subscribe({
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
}

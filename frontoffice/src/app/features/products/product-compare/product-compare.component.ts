import { Component } from '@angular/core';
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
  results: Product[] = [];
  loading = false;
  searched = false;

  constructor(private productService: ProductService) {}

  compare() {
    if (!this.searchName.trim()) return;
    this.loading = true;
    this.searched = true;
    this.productService.compareByName(this.searchName).subscribe({
      next: r => { this.results = r; this.loading = false; },
      error: () => this.loading = false
    });
  }

  cheapest(): Product | null {
    return this.results.length ? this.results[0] : null;
  }
}
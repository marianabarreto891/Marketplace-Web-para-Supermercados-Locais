import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, Product } from '../../../core/services/product.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  categories: { _id: string; name: string }[] = [];
  search = '';
  selectedCategory = 'all';
  sort = 'asc';
  loading = false;
  private searchSubject = new Subject<string>();

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.productService.getCategories().subscribe(cats => this.categories = cats);
    this.loadProducts();
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => this.loadProducts());
  }

  onSearchChange() {
    this.searchSubject.next(this.search);
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts({
      search: this.search,
      category: this.selectedCategory,
      sort: this.sort
    }).subscribe({
      next: p => { this.products = p; this.loading = false; },
      error: () => this.loading = false
    });
  }

  getImageUrl(img: string) {
    return img ? `http://localhost:3000/uploads/products/${img}` : 'assets/no-image.png';
  }
}
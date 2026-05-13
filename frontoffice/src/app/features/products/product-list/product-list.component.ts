import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ProductService,
  Product,
  SupermarketSummary,
} from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<{ _id: string; name: string }[]>([]);
  supermarkets = signal<SupermarketSummary[]>([]);
  search = '';
  selectedCategory = 'all';
  selectedSupermarket = 'all';
  sort = 'asc';
  loading = signal(false);
  errorMessage = signal('');
  cartMessage = '';
  cartMessageType: 'success' | 'error' | '' = '';
  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.productService
      .getCategories()
      .pipe(timeout(10000))
      .subscribe({
        next: (cats) => this.categories.set(Array.isArray(cats) ? cats : []),
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar as categorias.');
          this.categories.set([]);
        },
      });

    this.productService
      .getSupermarkets()
      .pipe(timeout(10000))
      .subscribe({
        next: (supermarkets) =>
          this.supermarkets.set(Array.isArray(supermarkets) ? supermarkets : []),
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar os supermercados.');
          this.supermarkets.set([]);
        },
      });

    this.loadProducts();
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadProducts());
  }

  onSearchChange() {
    this.searchSubject.next(this.search);
  }

  loadProducts() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.productService
      .getProducts({
        search: this.search,
        category: this.selectedCategory,
        supermarket: this.selectedSupermarket,
        sort: this.sort,
      })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (p) => {
          this.products.set(Array.isArray(p) ? p : []);
        },
        error: () => {
          this.products.set([]);
          this.errorMessage.set(
            'Nao foi possivel carregar os produtos. Confirma se o backend esta a correr em http://localhost:3000.'
          );
        },
      });
  }

  getImageUrl(img: string) {
    return img ? `http://localhost:3000/uploads/products/${img}` : 'assets/no-image.png';
  }

  addToCart(product: Product) {
    const result = this.cartService.addProduct(product);
    this.cartMessage = result.message;
    this.cartMessageType = result.success ? 'success' : 'error';
  }

  getSelectedSupermarketRoute(): string[] {
    return ['/supermarkets', this.selectedSupermarket, 'reviews'];
  }
}

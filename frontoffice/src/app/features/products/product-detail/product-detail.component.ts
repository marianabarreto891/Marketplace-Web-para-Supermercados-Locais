import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Product, ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  alternatives = signal<Product[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  cartMessage = signal('');
  cartMessageType = signal<'success' | 'error' | ''>('');

  cheapest = computed(() => this.alternatives()[0] || null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id') || '';

    this.productService.getProductDetail(productId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.product.set(data.product);
          this.alternatives.set(Array.isArray(data.alternatives) ? data.alternatives : []);
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar o detalhe do produto.');
        },
      });
  }

  getImageUrl(img: string) {
    return img ? `http://localhost:3000/uploads/products/${img}` : 'assets/no-image.png';
  }

  addToCart(product: Product) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const result = this.cartService.addProduct(product);
    this.cartMessage.set(result.message);
    this.cartMessageType.set(result.success ? 'success' : 'error');
  }
}

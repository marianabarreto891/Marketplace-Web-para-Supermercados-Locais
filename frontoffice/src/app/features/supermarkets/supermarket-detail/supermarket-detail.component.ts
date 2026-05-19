import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, SupermarketReviewsResponse, Product } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-supermarket-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supermarket-detail.component.html',
})
export class SupermarketDetailComponent implements OnInit {
  supermarketId = '';
  reviews = signal<SupermarketReviewsResponse | null>(null);
  products = signal<Product[]>([]);
  loadingReviews = signal(true);
  loadingProducts = signal(true);
  activeTab = signal<'reviews' | 'products'>('reviews');

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.supermarketId = this.route.snapshot.paramMap.get('id') || '';

    this.productService.getSupermarketReviews(this.supermarketId).subscribe({
      next: (data) => { this.reviews.set(data); this.loadingReviews.set(false); },
      error: () => this.loadingReviews.set(false),
    });

    this.productService.getProducts({ supermarket: this.supermarketId, sort: 'asc', page: 1, limit: 100 }).subscribe({
      next: (res) => { this.products.set(res.products || []); this.loadingProducts.set(false); },
      error: () => this.loadingProducts.set(false),
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
  this.cartService.addProduct(product);
}
}
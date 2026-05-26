import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, SupermarketReviewsResponse, SupermarketCouriersResponse, Product } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

import * as L from 'leaflet';

@Component({
  selector: 'app-supermarket-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supermarket-detail.component.html',
})
export class SupermarketDetailComponent implements OnInit, OnDestroy {
  supermarketId = '';
  reviews = signal<SupermarketReviewsResponse | null>(null);
  couriers = signal<SupermarketCouriersResponse | null>(null);
  products = signal<Product[]>([]);
  loadingReviews = signal(true);
  loadingProducts = signal(true);
  activeTab = signal<'reviews' | 'products' | 'couriers'>('products');

  private map: L.Map | undefined;

  supermarketName = computed(() =>
    this.reviews()?.supermarket?.name ||
    this.products()[0]?.supermarket?.name ||
    'Supermercado'
  );

  supermarketLocation = computed(() =>
    this.reviews()?.supermarket?.location ||
    this.products()[0]?.supermarket?.location ||
    ''
  );

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
      next: (data) => {
        this.reviews.set(data);
        this.loadingReviews.set(false);

        setTimeout(() => {
          const lat = (data.supermarket as any)?.lat;
          const lon = (data.supermarket as any)?.lon;
          const name = data.supermarket?.name || 'Supermercado';
          const location = data.supermarket?.location || '';

          if (lat && lon) {
            this.inicializeMap(lat, lon, name);
          } else if (location) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Portugal')}`)
              .then(res => res.json())
              .then(results => {
                if (results && results.length > 0) {
                  this.inicializeMap(parseFloat(results[0].lat), parseFloat(results[0].lon), name);
                } else {
                  this.inicializeMap(39.3999, -8.2245, name);
                }
              })
              .catch(() => this.inicializeMap(39.3999, -8.2245, name));
          } else {
            this.inicializeMap(39.3999, -8.2245, name);
          }
        }, 100);
      },
      error: () => this.loadingReviews.set(false),
    });

    this.productService.getSupermarketCouriers(this.supermarketId).subscribe({
      next: (data) => this.couriers.set(data),
      error: () => {},
    });

    this.productService.getProducts({ supermarket: this.supermarketId, sort: 'asc', page: 1, limit: 100 }).subscribe({
      next: (res) => { this.products.set(res.products || []); this.loadingProducts.set(false); },
      error: () => this.loadingProducts.set(false),
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  inicializeMap(lat: number, lon: number, name: string) {
    if (this.map) this.map.remove();

    this.map = L.map('supermarket-map').setView([lat, lon], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const customIcon = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    L.marker([lat, lon], { icon: customIcon }).addTo(this.map)
      .bindPopup(`<b>${name}</b>`)
      .openPopup();
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
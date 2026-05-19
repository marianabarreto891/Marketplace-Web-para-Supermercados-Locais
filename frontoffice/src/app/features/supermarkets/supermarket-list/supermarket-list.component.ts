import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService, SupermarketSummary } from '../../../core/services/product.service';

@Component({
  selector: 'app-supermarket-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supermarket-list.component.html',
})
export class SupermarketListComponent implements OnInit {
  supermarkets = signal<SupermarketSummary[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.productService.getSupermarkets().subscribe({
      next: (list) => { this.supermarkets.set(list); this.loading.set(false); },
      error: () => { this.errorMessage.set('Nao foi possivel carregar os supermercados.'); this.loading.set(false); },
    });
  }
}
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-list/product-list.component').then(
        (m) => m.ProductListComponent
      ),
  },
  {
    path: 'compare',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/product-compare/product-compare.component').then(
        (m) => m.ProductCompareComponent
      ),
  },
  {
    path: 'supermarkets/:id/reviews',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/supermarkets/supermarket-reviews/supermarket-reviews.component'
      ).then((m) => m.SupermarketReviewsComponent),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/cart/cart-page/cart-page.component').then(
        (m) => m.CartPageComponent
      ),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout-page/checkout-page.component').then(
        (m) => m.CheckoutPageComponent
      ),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/order-history/order-history.component').then(
        (m) => m.OrderHistoryComponent
      ),
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/order-detail/order-detail.component').then(
        (m) => m.OrderDetailComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/dashboard/client-dashboard/client-dashboard.component'
      ).then((m) => m.ClientDashboardComponent),
  },
  { path: '**', redirectTo: 'products' },
];

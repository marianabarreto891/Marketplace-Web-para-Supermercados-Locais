export interface DashboardTopProduct {
  productId: string;
  name: string;
  quantity: number;
}

export interface DashboardRecentOrder {
  orderId: string;
  displayId?: string;
  supermarketName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalSpent: number;
  mostPurchasedProducts: DashboardTopProduct[];
  recentOrders: DashboardRecentOrder[];
}

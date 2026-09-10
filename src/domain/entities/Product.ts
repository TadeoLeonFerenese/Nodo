export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  code: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
}

export interface UpdateProductInput {
  code?: string;
  name?: string;
  price?: number;
  minStock?: number;
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  createdAt: string;
}

export interface CreateStockMovementInput {
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

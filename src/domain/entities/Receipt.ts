export type ReceiptStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface ReceiptItem {
  name: string;
  quantity: number;
  code?: string;
  unitPrice?: number;
}

export interface Receipt {
  id: string;
  imageUrl: string;
  status: ReceiptStatus;
  items: ReceiptItem[];
  createdAt: string;
}

export interface OrderData {
  id: string;
  productId: string;
  quantity: number;
  status: string;
  idempotencyKey: string;
}

export interface IOrderRepository {
  findByIdempotencyKey(key: string): Promise<OrderData | null>;
  createOrderWithStockValidation(
    data: Omit<OrderData, "id" | "status">,
  ): Promise<OrderData>;
  updateOrderStatusAndStock(
    orderId: string,
    productId: string,
    quantity: number,
    status: string,
  ): Promise<void>;
}

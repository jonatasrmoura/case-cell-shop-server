import {
  IOrderRepository,
  OrderData,
} from "../domain/repositories/IOrderRepository";

export class InMemoryOrderRepository implements IOrderRepository {
  public orders: OrderData[] = [];
  public products: { id: string; stock: number }[] = [];

  async findByIdempotencyKey(key: string): Promise<OrderData | null> {
    return this.orders.find((order) => order.idempotencyKey === key) || null;
  }

  async createOrderWithStockValidation(
    data: Omit<OrderData, "id" | "status">,
  ): Promise<OrderData> {
    const product = this.products.find((p) => p.id === data.productId);

    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    if (product.stock < data.quantity) throw new Error("INSUFFICIENT_STOCK");

    // Decrementa o estoque na memória
    product.stock -= data.quantity;

    const order: OrderData = {
      id: Math.random().toString(),
      status: "SUCCESS",
      ...data,
    };

    this.orders.push(order);
    return order;
  }

  async updateOrderStatusAndStock(
    orderId: string,
    productId: string,
    quantity: number,
    status: string,
  ): Promise<void> {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) order.status = status;

    // Devolve o estoque em caso de falha
    const product = this.products.find((p) => p.id === productId);
    if (product) product.stock += quantity;
  }
}

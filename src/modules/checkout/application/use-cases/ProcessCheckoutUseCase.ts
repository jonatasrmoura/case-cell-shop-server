import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IERPService } from "../../domain/services/IERPService";

interface CheckoutRequest {
  productId: string;
  quantity: number;
  idempotencyKey: string;
}

export class ProcessCheckoutUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private erpService: IERPService,
  ) {}

  async execute({ productId, quantity, idempotencyKey }: CheckoutRequest) {
    const existingOrder =
      await this.orderRepository.findByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      if (existingOrder.status === "SUCCESS")
        return { message: "Pedido já processado.", orderId: existingOrder.id };
      throw new Error("ORDER_ALREADY_PROCESSING");
    }

    const order = await this.orderRepository.createOrderWithStockValidation({
      productId,
      quantity,
      idempotencyKey,
    });

    try {
      await this.erpService.processPayment(order.id);
      return { message: "Compra realizada com sucesso!", orderId: order.id };
    } catch (error) {
      await this.orderRepository.updateOrderStatusAndStock(
        order.id,
        productId,
        quantity,
        "FAILED",
      );
      throw new Error("ERP_INTEGRATION_FAILED");
    }
  }
}

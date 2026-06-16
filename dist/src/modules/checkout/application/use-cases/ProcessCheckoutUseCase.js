export class ProcessCheckoutUseCase {
    orderRepository;
    erpService;
    constructor(orderRepository, erpService) {
        this.orderRepository = orderRepository;
        this.erpService = erpService;
    }
    async execute({ productId, quantity, idempotencyKey }) {
        const existingOrder = await this.orderRepository.findByIdempotencyKey(idempotencyKey);
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
        }
        catch (error) {
            await this.orderRepository.updateOrderStatusAndStock(order.id, productId, quantity, "FAILED");
            throw new Error("ERP_INTEGRATION_FAILED");
        }
    }
}

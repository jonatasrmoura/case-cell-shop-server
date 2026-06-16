export class InMemoryOrderRepository {
    orders = [];
    products = [];
    async findByIdempotencyKey(key) {
        return this.orders.find((order) => order.idempotencyKey === key) || null;
    }
    async createOrderWithStockValidation(data) {
        const product = this.products.find((p) => p.id === data.productId);
        if (!product)
            throw new Error("PRODUCT_NOT_FOUND");
        if (product.stock < data.quantity)
            throw new Error("INSUFFICIENT_STOCK");
        product.stock -= data.quantity;
        const order = {
            id: Math.random().toString(),
            status: "SUCCESS",
            ...data,
        };
        this.orders.push(order);
        return order;
    }
    async updateOrderStatusAndStock(orderId, productId, quantity, status) {
        const order = this.orders.find((o) => o.id === orderId);
        if (order)
            order.status = status;
        const product = this.products.find((p) => p.id === productId);
        if (product)
            product.stock += quantity;
    }
}

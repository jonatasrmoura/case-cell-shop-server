import { prisma } from "../../../../shared/utils/prisma";
export class PrismaOrderRepository {
    async findByIdempotencyKey(key) {
        return prisma.order.findUnique({ where: { idempotencyKey: key } });
    }
    async createOrderWithStockValidation(data) {
        return await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: data.productId },
            });
            if (!product)
                throw new Error("PRODUCT_NOT_FOUND");
            if (product.stock < data.quantity)
                throw new Error("INSUFFICIENT_STOCK");
            await tx.product.update({
                where: { id: data.productId },
                data: { stock: { decrement: data.quantity } },
            });
            return await tx.order.create({
                data: {
                    productId: data.productId,
                    quantity: data.quantity,
                    idempotencyKey: data.idempotencyKey,
                    status: "SUCCESS",
                },
            });
        });
    }
    async updateOrderStatusAndStock(orderId, productId, quantity, status) {
        await prisma.$transaction([
            prisma.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } },
            }),
            prisma.order.update({
                where: { id: orderId },
                data: { status },
            }),
        ]);
    }
}

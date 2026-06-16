import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { processPaymentInERP } from "../../utils/erp-simulator";
export async function checkoutRoutes(app) {
    app.post("/checkout", async (request, reply) => {
        const checkoutBodySchema = z.object({
            productId: z.uuid(),
            quantity: z.number().int().positive(),
        });
        const checkoutHeadersSchema = z.object({
            "x-idempotency-key": z.uuid(),
        });
        try {
            const { productId, quantity } = checkoutBodySchema.parse(request.body);
            const { "x-idempotency-key": idempotencyKey } = checkoutHeadersSchema.parse(request.headers);
            const existingOrder = await prisma.order.findUnique({
                where: { idempotencyKey },
            });
            if (existingOrder) {
                if (existingOrder.status === "SUCCESS") {
                    return reply.status(200).send({
                        message: "Pedido já processado.",
                        orderId: existingOrder.id,
                    });
                }
                return reply
                    .status(409)
                    .send({ error: "Pedido anterior falhou ou está em andamento." });
            }
            const order = await prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                    where: { id: productId },
                });
                if (!product)
                    throw new Error("PRODUCT_NOT_FOUND");
                if (product.stock < quantity)
                    throw new Error("INSUFFICIENT_STOCK");
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: quantity } },
                });
                return await tx.order.create({
                    data: {
                        productId,
                        quantity,
                        idempotencyKey,
                        status: "SUCCESS",
                    },
                });
            });
            try {
                await processPaymentInERP(order.id);
                return reply.status(200).send({
                    message: "Compra realizada com sucesso!",
                    orderId: order.id,
                });
            }
            catch (erpError) {
                await prisma.product.update({
                    where: { id: productId },
                    data: { stock: { increment: quantity } },
                });
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "FAILED" },
                });
                return reply
                    .status(503)
                    .send({ error: "Falha de processamento no ERP. Tente novamente." });
            }
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply
                    .status(400)
                    .send({ error: "Dados inválidos", details: error.format() });
            }
            if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
                return reply.status(409).send({ error: "Estoque insuficiente." });
            }
            if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
                return reply.status(404).send({ error: "Produto não encontrado." });
            }
            return reply.status(500).send({ error: "Erro interno do servidor." });
        }
    });
}

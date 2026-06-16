import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ProcessCheckoutUseCase } from "../../application/use-cases/ProcessCheckoutUseCase";

export class CheckoutController {
  constructor(private processCheckoutUseCase: ProcessCheckoutUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      productId: z.uuid(),
      quantity: z.number().int().positive(),
    });

    const headersSchema = z.object({
      "x-idempotency-key": z.uuid(),
    });

    try {
      const { productId, quantity } = bodySchema.parse(request.body);
      const { "x-idempotency-key": idempotencyKey } = headersSchema.parse(
        request.headers,
      );

      const result = await this.processCheckoutUseCase.execute({
        productId,
        quantity,
        idempotencyKey,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof z.ZodError)
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.format((err) => err.message || "Campo inválido"),
        });

      const err = error as Error;
      if (err.message === "ORDER_ALREADY_PROCESSING")
        return reply
          .status(409)
          .send({ error: "Pedido anterior falhou ou está em andamento." });
      if (err.message === "PRODUCT_NOT_FOUND")
        return reply.status(404).send({ error: "Produto não encontrado." });
      if (err.message === "INSUFFICIENT_STOCK")
        return reply.status(409).send({ error: "Estoque insuficiente." });
      if (err.message === "ERP_INTEGRATION_FAILED")
        return reply
          .status(503)
          .send({ error: "Falha de processamento no ERP. Tente novamente." });

      return reply.status(500).send({ error: "Erro interno do servidor." });
    }
  }
}

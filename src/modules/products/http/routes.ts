import { FastifyInstance } from "fastify";
import { prisma } from "../../../shared/utils/prisma";

export async function productsRoutes(app: FastifyInstance) {
  app.get("/products", async (request, reply) => {
    try {
      const products = await prisma.product.findMany();
      return reply.status(200).send(products);
    } catch (error) {
      return reply.status(500).send({ error: "Erro ao buscar produtos." });
    }
  });
}

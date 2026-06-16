import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

import { prisma } from "../../../shared/utils/prisma";
import { paginationQueryConfig } from "../../../shared/utils/pagination-query-config";

export const productsSchema = z.object({
  page: z.string().default("1"),
  limit: z.string().default("20"),
});

export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/products",
    {
      schema: {
        querystring: productsSchema,
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query;

      const { limitCurrent, offset, pageCurrent } = paginationQueryConfig(
        page,
        limit,
      );

      try {
        const [products, totalCount] = await prisma.$transaction([
          prisma.product.findMany({
            take: limitCurrent,
            skip: offset,
          }),
          prisma.product.count(),
        ]);

        return reply.status(200).send({
          data: products,
          meta: {
            totalItems: totalCount,
            currentPage: pageCurrent,
            totalPages: Math.ceil(totalCount / limitCurrent),
          },
        });
      } catch (error) {
        return reply.status(500).send({ error: "Erro ao buscar produtos." });
      }
    },
  );
};

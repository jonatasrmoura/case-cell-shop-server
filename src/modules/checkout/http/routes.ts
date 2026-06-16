import { FastifyInstance } from "fastify";
import { PrismaOrderRepository } from "../infrastructure/database/PrismaOrderRepository";
import { FakeERPService } from "../infrastructure/services/FakeERPService";
import { ProcessCheckoutUseCase } from "../application/use-cases/ProcessCheckoutUseCase";
import { CheckoutController } from "./controllers/CheckoutController";

export async function checkoutRoutes(app: FastifyInstance) {
  // Fábrica manual de injeção de dependências
  const orderRepository = new PrismaOrderRepository();
  const erpService = new FakeERPService();
  const useCase = new ProcessCheckoutUseCase(orderRepository, erpService);
  const controller = new CheckoutController(useCase);

  app.post("/checkout", (req, res) => controller.handle(req, res));
}

import { describe, it, expect, beforeEach } from "vitest";
import { ProcessCheckoutUseCase } from "./ProcessCheckoutUseCase";
import { InMemoryOrderRepository } from "../../test/InMemoryOrderRepository";
import { MockERPService } from "../../test/MockERPService";
describe("ProcessCheckoutUseCase", () => {
    let orderRepository;
    let erpService;
    let sut;
    beforeEach(() => {
        orderRepository = new InMemoryOrderRepository();
        erpService = new MockERPService();
        sut = new ProcessCheckoutUseCase(orderRepository, erpService);
        orderRepository.products.push({ id: "prod-1", stock: 10 });
    });
    it("deve processar o checkout com sucesso e decrementar o estoque", async () => {
        const result = await sut.execute({
            productId: "prod-1",
            quantity: 2,
            idempotencyKey: "key-123",
        });
        expect(result.message).toBe("Compra realizada com sucesso!");
        expect(orderRepository.orders).toHaveLength(1);
        expect(orderRepository.products[0].stock).toBe(8);
    });
    it("não deve permitir a venda se o estoque for insuficiente", async () => {
        await expect(() => sut.execute({
            productId: "prod-1",
            quantity: 11,
            idempotencyKey: "key-456",
        })).rejects.toThrow("INSUFFICIENT_STOCK");
        expect(orderRepository.orders).toHaveLength(0);
        expect(orderRepository.products[0].stock).toBe(10);
    });
    it("deve retornar sucesso sem debitar estoque novamente se a mesma chave de idempotência for usada (Duplo Clique)", async () => {
        await sut.execute({
            productId: "prod-1",
            quantity: 1,
            idempotencyKey: "key-duplicada",
        });
        const result = await sut.execute({
            productId: "prod-1",
            quantity: 1,
            idempotencyKey: "key-duplicada",
        });
        expect(result.message).toBe("Pedido já processado.");
        expect(orderRepository.orders).toHaveLength(1);
        expect(orderRepository.products[0].stock).toBe(9);
    });
    it("deve fazer rollback (devolver o estoque) se o ERP falhar", async () => {
        erpService.shouldFail = true;
        await expect(() => sut.execute({
            productId: "prod-1",
            quantity: 3,
            idempotencyKey: "key-fail",
        })).rejects.toThrow("ERP_INTEGRATION_FAILED");
        expect(orderRepository.orders[0].status).toBe("FAILED");
        expect(orderRepository.products[0].stock).toBe(10);
    });
});

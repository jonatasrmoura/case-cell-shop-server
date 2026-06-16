import { describe, it, expect, beforeEach } from "vitest";
import { ProcessCheckoutUseCase } from "./ProcessCheckoutUseCase";
import { InMemoryOrderRepository } from "../../test/InMemoryOrderRepository";
import { MockERPService } from "../../test/MockERPService";

describe("ProcessCheckoutUseCase", () => {
  let orderRepository: InMemoryOrderRepository;
  let erpService: MockERPService;
  let sut: ProcessCheckoutUseCase; // SUT = System Under Test

  beforeEach(() => {
    orderRepository = new InMemoryOrderRepository();
    erpService = new MockERPService();
    sut = new ProcessCheckoutUseCase(orderRepository, erpService);

    // Adiciona um produto fictício ao banco em memória antes de cada teste
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
    expect(orderRepository.products[0].stock).toBe(8); // 10 - 2
  });

  it("não deve permitir a venda se o estoque for insuficiente", async () => {
    await expect(() =>
      sut.execute({
        productId: "prod-1",
        quantity: 11, // Tentando comprar mais do que os 10 disponíveis
        idempotencyKey: "key-456",
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK");

    expect(orderRepository.orders).toHaveLength(0);
    expect(orderRepository.products[0].stock).toBe(10); // O estoque deve permanecer intacto
  });

  it("deve retornar sucesso sem debitar estoque novamente se a mesma chave de idempotência for usada (Duplo Clique)", async () => {
    // Primeira requisição
    await sut.execute({
      productId: "prod-1",
      quantity: 1,
      idempotencyKey: "key-duplicada",
    });

    // Segunda requisição (duplo clique acidental)
    const result = await sut.execute({
      productId: "prod-1",
      quantity: 1,
      idempotencyKey: "key-duplicada",
    });

    expect(result.message).toBe("Pedido já processado.");
    expect(orderRepository.orders).toHaveLength(1); // Apenas 1 pedido foi criado
    expect(orderRepository.products[0].stock).toBe(9); // O estoque só reduziu 1 vez
  });

  it("deve fazer rollback (devolver o estoque) se o ERP falhar", async () => {
    erpService.shouldFail = true; // Força a falha da simulação do ERP

    await expect(() =>
      sut.execute({
        productId: "prod-1",
        quantity: 3,
        idempotencyKey: "key-fail",
      }),
    ).rejects.toThrow("ERP_INTEGRATION_FAILED");

    // O status do pedido deve ter mudado para FAILED
    expect(orderRepository.orders[0].status).toBe("FAILED");

    // O estoque deve voltar para 10
    expect(orderRepository.products[0].stock).toBe(10);
  });
});

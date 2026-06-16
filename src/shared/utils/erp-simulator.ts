export async function processPaymentInERP(orderId: string): Promise<boolean> {
  // Simula um delay do ERP entre 1 e 3 segundos para testarmos o timeout no front
  const delay = Math.floor(Math.random() * 2000) + 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simula 30% de chance de falha (Erro interno do ERP)
  const isSuccess = Math.random() > 0.3;

  if (!isSuccess) {
    throw new Error("ERP Service Unavailable");
  }

  return true;
}

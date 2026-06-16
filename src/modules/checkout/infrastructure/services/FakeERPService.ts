import { IERPService } from "../../domain/services/IERPService";

export class FakeERPService implements IERPService {
  async processPayment(orderId: string): Promise<boolean> {
    const delay = Math.floor(Math.random() * 2000) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const isSuccess = Math.random() > 0.3;
    if (!isSuccess) throw new Error("ERP Service Unavailable");

    return true;
  }
}

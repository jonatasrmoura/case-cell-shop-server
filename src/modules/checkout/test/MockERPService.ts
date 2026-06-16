import { IERPService } from "../domain/services/IERPService";

export class MockERPService implements IERPService {
  public shouldFail = false;

  async processPayment(orderId: string): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error("ERP Service Unavailable");
    }
    return true;
  }
}

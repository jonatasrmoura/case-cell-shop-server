export interface IERPService {
  processPayment(orderId: string): Promise<boolean>;
}

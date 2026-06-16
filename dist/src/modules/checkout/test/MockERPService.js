export class MockERPService {
    shouldFail = false;
    async processPayment(orderId) {
        if (this.shouldFail) {
            throw new Error("ERP Service Unavailable");
        }
        return true;
    }
}

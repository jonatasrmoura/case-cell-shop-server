export class FakeERPService {
    async processPayment(orderId) {
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        const isSuccess = Math.random() > 0.3;
        if (!isSuccess)
            throw new Error("ERP Service Unavailable");
        return true;
    }
}

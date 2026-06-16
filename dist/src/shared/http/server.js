import fastify from "fastify";
import { checkoutRoutes } from "../../modules/checkout/http/routes";
import { productsRoutes } from "../../modules/products/http/routes";
const app = fastify({ logger: true });
app.register(checkoutRoutes);
app.register(productsRoutes);
app.listen({ port: 3333 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});

import fastify from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { checkoutRoutes } from "../../modules/checkout/http/routes";
import { productsRoutes } from "../../modules/products/http/routes";

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.register(cors, {
  origin: "*", // DEV
  methods: ["GET", "POST"],
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(checkoutRoutes);
app.register(productsRoutes);

app.listen({ port: 3333 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

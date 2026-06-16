import { prisma } from "./prisma";
async function main() {
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.product.createMany({
        data: [
            { name: "Capinha de Silicone Transparente", price: 49.9, stock: 10 },
            { name: "Capinha Blindada", price: 149.99, stock: 40 },
            { name: "Capinha de Anime", price: 49.99, stock: 23 },
            { name: "Capinha Anti-Impacto Preta", price: 79.9, stock: 5 },
            { name: "Capinha MagSafe Couro Premium", price: 129.9, stock: 1 },
        ],
    });
    console.log("✅ Banco de dados populado com sucesso!");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

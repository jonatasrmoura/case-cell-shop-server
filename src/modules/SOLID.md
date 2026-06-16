# S.O.L.I.D

## 1. Camada pai Modules

Aqui é definido onde todo o core principal da aplicação vai ficar. Regras de negócios,
Interfaces, caso de uso, Implementações, Controller e Rotas.

## 2. Camada de domínio/domain (Interfaces)

Aqui é definido as "regras do jogo" sem depender de nenhuma ferramenta externa (nem Prisma, nem Fastify).

## 3. Camada de Aplicação (O Caso de Uso)

O coração da sua aplicação. Ele não importa o Prisma nem o Fastify. Ele apenas recebe as interfaces (Inversão de Dependência).

## 4. Camada de Infraestrutura (Implementações)

Aqui é implementado as interfaces usando as ferramentas reais (Prisma e nossa simulação do ERP).

## 5. Camada HTTP (Controller e Rotas)

O Controller lida apenas com requisições HTTP, valida o Zod e chama o Caso de Uso.

## Visão geral - Exemplo do projeto inicial

```Plaintext
src/
 ┣ modules/
 ┃ ┗ checkout/
 ┃   ┣ domain/
 ┃   ┃ ┣ repositories/
 ┃   ┃ ┃ ┗ IOrderRepository.ts
 ┃   ┃ ┗ services/
 ┃   ┃   ┗ IERPService.ts
 ┃   ┣ application/
 ┃   ┃ ┗ use-cases/
 ┃   ┃   ┗ ProcessCheckoutUseCase.ts
 ┃   ┣ infrastructure/
 ┃   ┃ ┣ database/
 ┃   ┃ ┃ ┗ PrismaOrderRepository.ts
 ┃   ┃ ┗ services/
 ┃   ┃   ┗ FakeERPService.ts
 ┃   ┗ http/
 ┃     ┣ controllers/
 ┃     ┃ ┗ CheckoutController.ts
 ┃     ┗ routes.ts
 ┣ shared/
 ┃ ┣ http/
 ┃ ┃ ┗ server.ts
 ┃ ┗ utils/
 ┃   ┗ prisma.ts
```

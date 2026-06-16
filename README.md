# 🛒 CaseCellShop Server - API (Back-end)

Este repositório contém a solução de back-end para o desafio técnico **CaseCellShop** (Nível Pleno). A API foi desenvolvida com foco em resiliência, consistência de dados em ambientes de alta concorrência e arquitetura escalável.

## 🛠️ Stack Tecnológica

Optou-se por manter a base solicitada (Node.js + TypeScript), mas utilizando ferramentas focadas em performance e tipagem rigorosa:

- **Node.js + Fastify:** Escolhido pela alta performance e baixo overhead em relação ao Express.
- **TypeScript + Zod:** Garantia de tipagem estática e validação rigorosa de contratos de entrada (Payload/Headers).
- **Prisma ORM + SQLite:** O SQLite foi utilizado para facilitar a execução local pelos avaliadores, sem necessidade de containers complexos. O Prisma foi adotado por facilitar transações atômicas e garantir _type-safety_.
- **Vitest:** Para execução rápida de testes unitários isolados.

## 🏗️ Arquitetura e Padrões (SOLID)

O projeto foi estruturado seguindo os princípios de **Clean Architecture** e **SOLID**, separando as responsabilidades em 3 camadas principais dentro do módulo de checkout:

1.  **Domain:** Interfaces e contratos (`IOrderRepository`, `IERPService`), totalmente agnósticos de ferramentas externas.
2.  **Application (Use Cases):** Onde reside a regra de negócio central (`ProcessCheckoutUseCase`), focada em tratar a venda, idempotência e rollback.
3.  **Infrastructure / HTTP:** Implementações reais (Prisma, Fastify) que consomem a camada de aplicação via Injeção de Dependências.

Isso garante que a regra de negócio seja 100% testável sem a necessidade de instanciar um banco de dados real.

## 🚀 Como Executar o Projeto

**Pré-requisitos:** Node.js (v18+) instalado.

1. Instale as dependências:

```bash
  npm install
```

2. Crie o banco de dados local (SQLite):

```bash
  npm run db:push
```

3. Popule o banco com produtos fictícios (Seed):

```bash
  npm run db:seed
```

4. Inicie o servidor de desenvolvimento:

```bash
  npm run dev
```

A API estará rodando em http://localhost:3333

5. Para rodar os Testes Automatizados:

```bash
  npm run test
```

## 🧠 Decisões Técnicas e Trade-offs (MVP)

Para atender aos problemas relatados pela CaseCellShop com um risco controlado (abordagem incremental), assumi os seguintes trade-offs nesta primeira entrega:

[x] Idempotência (Prevenção de Duplo Clique): A rota de checkout exige o header x-idempotency-key. Se a mesma chave for enviada duas vezes, a API reconhece o processamento anterior e retorna sucesso sem debitar o estoque novamente.

[x] Consistência de Estoque (Race Conditions): Utilizei as transações atômicas do Prisma ($transaction). O estoque é lido e decrementado dentro de um lock transacional, impedindo que requisições simultâneas vendam itens que não existem.

[x] Simulação de Falha no ERP: Criei um serviço FakeERPService que injeta um delay de 1 a 3 segundos e possui 30% de chance de falha. Quando a falha ocorre, o sistema realiza uma Ação Compensatória (Rollback), devolvendo a unidade ao estoque do produto e marcando o pedido como FAILED.

## 🔮 Próximos Passos (Evolução da Arquitetura)

Pensando em um ambiente produtivo de alta escala, as próximas iterações deste projeto incluiriam:

[1]. Mensageria Assíncrona (RabbitMQ / SQS): O processo de checkout não esperaria o ERP responder. O pedido seria salvo como "Pendente" e enviado para uma fila. Um worker consumiria a fila e tentaria a integração com o ERP utilizando políticas de Retry e Dead Letter Queues (DLQ).

[2]. Camada de Cache (Redis): A rota de listagem de produtos (GET /products) passaria a ler de um cache em memória em vez do banco relacional, resolvendo o problema de "Vitrine Lenta" relatado pelo cliente.

[3]. Observabilidade: Implementação de logs estruturados (Pino) com Trace IDs atrelados a ferramentas como Datadog/Sentry para monitoramento ativo das falhas do ERP.

[4]. Documentação: Integração com Swagger/OpenAPI para expor os contratos do front-end dinamicamente.

# Respostas Conceituais

## Pergunta 1 - Diagnóstico e trade-offs

Para analisar o cenário, dividi os 3 problemas relatados na operação da CaseCellShop:

**01 | Performance da vitrine**

- **A causa:** O grande gargalo é o acoplamento. A Loja Virtual consome a vitrine através de uma chamada REST síncrona direto no ERP Central. Como o ERP é um monolito focado em regras financeiras, ele não foi feito para suportar milhões de leituras simultâneas.

- **O impacto:** Carregamento muito lento da página principal, causando alta taxa de rejeição (bounce rate) e frustração do cliente antes mesmo de ver os produtos.

- **Caminhos possíveis:** Primeiro Implementar uma camada de Cache (Redis) na API da loja. Segundo Criar um banco de leitura próprio para a loja (padrão CQRS), replicando os dados do ERP de forma assíncrona.

- **Trade-offs:** O Cache é rápido de implementar e tem baixo custo de infraestrutura, mas trabalha com dados eventuais (TTL), podendo mostrar um preço defasado por alguns minutos. O CQRS é altamente escalável, porém exige uma infraestrutura complexa de replicação de dados.

- Prioridade: Implementaria o Cache (Redis) primeiro. É um quick-win que resolve o problema de performance imediato com esforço reduzido.

**02 | Consistência de estoque**

- **A causa:** A ausência de controle de concorrência (Race Conditions). Com milhões de acessos, dezenas de requisições chegam no mesmo milissegundo, validam que o estoque é maior que zero e concluem a compra antes que o sistema tenha tempo de atualizar o banco.

- **O impacto:** Venda de produtos inexistentes, o que gera chargebacks, devoluções, prejuízo financeiro e dano severo à imagem da marca.

- **Caminhos possíveis:** Primeiro, usar transações atômicas com Locks (Pessimistic ou Optimistic) direto no banco de dados. Segundo, enfileirar os pedidos em processamento sequencial (Fila).

- **rade-offs:** Locks no banco resolvem o problema rapidamente, mas podem gerar lentidão (gargalo de I/O) se muitas pessoas tentarem comprar o exato mesmo produto ao mesmo tempo. A Fila elimina a concorrência direta, mas exige mudanças profundas na experiência do usuário (compra assíncrona).

- **Prioridade:** Priorizaria o Lock transacional (como implementado no código usando transações do Prisma). Ele resolve a dor nas vendas falsas imediatamente.

**03 | Resiliência do checkout**

- **A causa:** O processo de faturamento no ERP ocorre de forma síncrona com o request HTTP do usuário. Se o ERP demora para processar, o limite de tempo da requisição web estoura (timeout).

- **O impacto:** O cliente perde a compra, fica confuso se foi cobrado ou não, e o negócio perde dinheiro no funil de conversão.

- **Caminhos possíveis:** Primeira opção, Mensageria (Processamento Assíncrono com RabbitMQ/SQS). Segunda opção, Aumentar os limites de timeout do servidor da loja.

- **Trade-offs:** Mensageria cria uma experiência fluida para o cliente, mas introduz complexidade (Workers, Dead Letter Queues). Aumentar o timeout é apenas um "band-aid" temporário que prende recursos do servidor e não garante que o ERP não falhará.

- **Prioridade:** Priorizaria a Mensageria Assíncrona.

## Pergunta 2 - Arquitetura alvo incremental

A arquitetura alvo visa proteger o ERP e tornar a loja autossuficiente.

- **Componentes Principais:** Loja Virtual (Front-end) -> API de Fachada/BFF (Node.js) -> Cache Redis -> Banco de Dados Relacional próprio da Loja -> Mensageria (RabbitMQ) -> Workers -> ERP.

- **Fluxo de Vitrine e Estoque:** O usuário acessa a vitrine e a API consulta primeiro o Redis. Se não houver cache, busca no Banco da Loja e atualiza o cache. O ERP não é tocado neste fluxo.

- **Fluxo de Checkout:** Ao finalizar a compra, a API atualiza o estoque local da Loja e salva o pedido como "Pendente". Imediatamente, lança um evento na fila (RabbitMQ) e retorna sucesso ao cliente. Um Worker consome essa fila e, de forma cadenciada, envia os pedidos para faturamento no ERP.

- **Sincronização:** Utilizaria Cron Jobs noturnos para reconciliação pesada e eventos via Webhooks do ERP para a Loja quando novos lotes de estoque chegassem.

- **Plano de Execução:**
  - **Primeiros 30 dias:** Implementar a API Intermediária da Loja com transações atômicas para proteger o estoque, além da chave de idempotência (escopo do MVP entregue).
  - **Até 60 dias:** Plugar o Redis para espelhar a vitrine e aliviar a leitura do ERP.
  - **Até 90 dias:** Implementar a fila (RabbitMQ) para o checkout assíncrono.

## Pergunta 3 - Estoque, concorrência e idempotência

- **Evitando venda duplicada (Concorrência):** Se dois clientes tentam comprar a última unidade, a solução utiliza transações ACID no banco de dados. A leitura e o débito do estoque ocorrem sob um bloqueio exclusivo (lock). O sistema processa uma de cada vez no nível do banco; o primeiro cliente leva, o segundo recebe o erro de "estoque insuficiente".

- **Reserva de estoque:** Neste modelo inicial (MVP), a dedução ocorre no momento da confirmação da compra. Numa evolução, eu criaria o status de "Reserva Temporária" no carrinho do cliente com expiração via Redis TTL (ex: expira em 15 minutos se não houver pagamento).

- **Retry e Duplo Clique (Idempotência):** No momento em que o cliente clica em "Comprar", o front-end gera um UUID único (x-idempotency-key) e o envia no cabeçalho. Se o cliente der duplo clique ou a rede oscilar e fizer um retry, o back-end verifica se aquela chave já foi processada. Se sim, ele retorna a resposta de sucesso original sem processar o pagamento ou descontar o estoque duas vezes.

- **Reconciliação:** A loja seria a dona do dado de "venda". Eventuais divergências seriam auditadas via um painel administrativo diário, comparando os logs de vendas da Loja com os pedidos registrados no ERP.

## Pergunta 4 - Contrato de API e modelo de erros

Proponho o seguinte contrato para o endpoint _POST /checkout_:

- Payload mínimo de entrada:

```json
// Headers: x-idempotency-key: "uuid-gerado-no-front"
{
  "productId": "string",
  "quantity": "number"
}
```

- **Respostas e reações do Front-end[cite: 4]:**
  - `200 OK` (Sucesso): Retorna `{ "message": "Pedido processado", "orderId": "123" }`. Front-end exibe um Toast verde de sucesso e atualiza a vitrine.

  - `400 Bad Request` (Erro de Validação): Retorna erro de tipagem/ausência de dados. Front-end notifica: "Dados de compra inválidos".

  - `409 Conflict` (Estoque insuficiente): Retorna `{ "error": "Insufficient stock" }`. Front-end alerta o usuário ("Poxa, alguém comprou a última unidade") e desabilita o botão.
  - `503 Service Unavailable` (Falha do ERP/Timeout): Front-end notifica: "O sistema de faturamento está instável. Tente novamente." e reabilita o botão para que o cliente possa fazer uma nova tentativa (segura pela chave de idempotência).

---

## Pergunta 5 - Testes e estratégia de validação

Para garantir a qualidade, adotei a seguinte estratégia:

- **Testes Unitários:** O foco foi testar a regra de negócio central isolada (`ProcessCheckoutUseCase`) usando Vitest, garantindo que o duplo clique (idempotência), o limite de estoque e o rollback do ERP funcionam em milissegundos, sem depender de banco de dados real.

- **Testes de Integração:** Validar as rotas HTTP e a integração com o banco real (SQLite local) para garantir que as transações e o Prisma estão funcionando juntos.

- **Cenários de Concorrência:** Simulação no back-end enviando dezenas de requisições assíncronas (`Promise.all`) para o mesmo `productId` no mesmo segundo, validando se o banco de dados impede o estoque negativo.

- **Estados do Front-end:** Garantir visualmente que o botão de "Comprar" receba um estado de `disabled/loading` no clique, prevenindo ações extras do usuário.

- **Próximo Passo (Documentado):** O que eu automatizaria futuramente seria a bateria de testes de contrato (E2E) com o Cypress ou Playwright simulando a jornada completa no navegador do usuário.

---

## Pergunta 6 - Uso de IA no desenvolvimento

Como um desenvolvedor pleno, utilizo a IA (Gemini/ChatGPT) como uma ferramenta de pair programming para alavancar a produtividade.

- **Tipos de Prompt:** Utilizo prompts focados em arquitetura e _design patterns_. Exemplo: _"Como implementar uma chave de idempotência num endpoint Node.js utilizando Clean Architecture?"_ ou _"Escreva o boilerplate de um componente React responsivo utilizando Tailwind v4"_.

- **O que delego:** Delego a criação de _boilerplates_, refatoração de métodos extensos para sintaxes mais modernas, geração de dados fictícios para banco de dados (seeds) e formatação de documentação (como o README).

- **O que NÃO delego:** Decisões de negócio. A IA não substitui o levantamento de requisitos nem a análise crítica de onde posicionar o banco de dados na arquitetura.

- **Verificação e Riscos:** Analiso todo o código gerado em busca de "alucinações" (ex: bibliotecas que foram descontinuadas ou código depreciado). O maior risco de aceitar sugestões sem revisão é a introdução de vulnerabilidades de segurança ou de regras de negócio acopladas que dificultam a manutenção futura. Nenhuma linha vai para o repositório sem que eu entenda 100% de sua responsabilidade.

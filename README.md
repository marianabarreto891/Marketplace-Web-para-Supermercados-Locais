# PAW_G25 - Marketplace de Supermercados Locais

Projeto desenvolvido no ambito da unidade curricular de Programacao em Ambiente Web.

A aplicacao implementa um marketplace/backoffice para supermercados locais, permitindo registo e autenticacao de utilizadores, gestao de supermercados, produtos, categorias, vendas em caixa, encomendas, entregas por estafeta, dashboards, cupoes de desconto, notificacoes por email e pagamentos via Stripe Checkout.

## Estado Da Arte

Este projeto encontra-se num estado funcional para o primeiro milestone, com funcionalidades extra ja integradas.

Funcionalidades principais:

- Autenticacao com sessoes Express.
- Perfis de utilizador: `cliente`, `supermercado`, `estafeta` e `admin`.
- Registo, login e logout.
- Redirecionamento por perfil depois do login.
- Administrador com dashboard, gestao de utilizadores, categorias, cupoes e aprovacao/rejeicao de supermercados.
- Supermercados com criacao, edicao, listagem e detalhe.
- Produtos com CRUD, stock, categoria, imagem e EAN/codigo de barras.
- Venda em caixa por supermercado/admin.
- Criacao automatica ou associacao de cliente durante a venda.
- Validacao de stock, quantidades, cliente, supermercado aprovado e metodo de entrega.
- Encomendas com estados: `pendente`, `confirmada`, `em_preparacao`, `em_entrega`, `entregue`, `cancelada`.
- Historico/listagem de encomendas por perfil.
- Dashboard de supermercado com estatisticas e produtos mais vendidos.
- Dashboard de estafeta com entregas, disponibilidade e supermercados com mais entregas.
- Regra de negocio: um estafeta so pode ter uma entrega em curso.
- Cliente pode consultar encomendas e avaliar supermercado/estafeta depois de entrega.
- Sistema simples de cupoes.
- Notificacoes por email ao cliente quando a encomenda e criada ou muda de estado.
- Pagamento online por Stripe Checkout.
- Geolocalizacao/mapas em zonas do projeto.

## Tecnologias

- Node.js
- Express.js
- EJS
- MongoDB Atlas
- Mongoose
- Express Session
- Bcrypt
- Multer
- Nodemailer
- Mailgen
- Stripe
- Bootstrap

## Estrutura Do Projeto

```text
paw_g25/
  app.js
  bin/www
  controllers/
  middlewares/
  models/
  public/
    scripts/
    stylesheets/
    uploads/products/
  routes/
  services/
  views/
```

Pastas principais:

| Pasta/Ficheiro | Funcao |
|---|---|
| `app.js` | Configuracao principal da app Express e montagem das rotas |
| `bin/www` | Arranque do servidor |
| `models/` | Schemas Mongoose |
| `controllers/` | Logica das funcionalidades |
| `routes/` | Definicao das rotas HTTP |
| `views/` | Paginas EJS |
| `public/` | CSS, scripts frontend e imagens carregadas |
| `middlewares/` | Middleware de autenticacao, roles e upload |
| `services/` | Servicos externos, como email |

## Instalar E Colocar A Rodar

### 1. Clonar ou atualizar o projeto

```powershell
git clone https://gitlab.estg.ipp.pt/8240334/paw_g25.git
cd paw_g25
```

Se ja tiveres o projeto:

```powershell
git fetch origin
git pull origin Features
```

### 2. Instalar dependencias

```powershell
npm install
```

### 3. Criar o ficheiro `.env`

Criar um ficheiro `.env` na raiz do projeto. O ficheiro deve conter pelo menos:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/Marketplace
MONGODB_DB=Marketplace
PORT=3000
APP_BASE_URL=http://localhost:3000
```

Para emails:

```env
MAIL_SERVICE=gmail
MAIL_USER=email_de_teste@gmail.com
MAIL_PASS=app_password_do_gmail
MAIL_FROM=Marketplace <email_de_teste@gmail.com>
```

Para Stripe:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Notas importantes:

- O codigo usa `MONGODB_URI`, nao `MONGO_URI`.
- O `.env` nao deve ser enviado para o Git se tiver credenciais reais.
- Para Gmail, usar App Password e nao a password normal da conta.
- `STRIPE_WEBHOOK_SECRET` pode ficar vazio para teste basico com redirect de sucesso, mas o webhook e recomendado.

### 4. Iniciar o servidor

```powershell
npm start
```

A aplicacao fica disponivel em:

```text
http://localhost:3000
```

## Utilizadores E Perfis

Perfis suportados:

| Role | Funcao |
|---|---|
| `cliente` | Consulta supermercados, produtos, encomendas e avalia encomendas entregues |
| `supermercado` | Gere supermercados, produtos, vendas e encomendas recebidas |
| `estafeta` | Consulta entregas, aceita entregas disponiveis e altera estado |
| `admin` | Aprova supermercados, gere utilizadores, categorias e cupoes |

Fluxo de login:

| Role | Redirecionamento |
|---|---|
| `admin` | `/admin/dashboard` |
| `supermercado` | `/supermarket/dashboard` |
| `estafeta` | `/courier/dashboard` |
| `cliente` | `/supermarket/list` |

## Contas De Teste

Estas contas existem na base de dados usada pelo grupo e podem ser utilizadas para demonstracao.

### Admin

| Email | Password | Observacao |
|---|---|---|
| `admin@ad.pt` | `admin` | Conta admin mais utilizada |
| `administrador@admin.pt` | `administrador` | Conta admin alternativa |
| `admin1@admin.en` | `admin1` | Conta admin alternativa |

### Supermercado

| Email | Password | Observacao |
|---|---|---|
| `supemercado@super.pt` | `supermercado` | Conta principal de supermercado |
| `super1@supermercado.pt` | `super` | Conta com dois supermercados associados |

### Estafeta

| Email | Password | Observacao |
|---|---|---|
| `estafeta@est.pt` | `estafeta` | Conta de estafeta |

### Cliente

| Email | Password | Observacao |
|---|---|---|
| `manuel@gmail.com` | `manuel` | Cliente utilizado |
| `cliente@cli.pt` | `cliente` | Conta cliente mais utilizada |
| `dias@gmail.com` | `dias` | Cliente alternativo |
| `josecarlosdias0009@gmail.com` | `jose` | Cliente alternativo |

## Rotas Desenvolvidas

### Rotas Publicas E Autenticacao

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/` | Publico | Pagina inicial |
| `GET` | `/users/login` | Publico | Formulario de login |
| `POST` | `/users/login` | Publico | Autentica utilizador |
| `GET` | `/users/register` | Publico | Formulario de registo |
| `POST` | `/users/register` | Publico | Regista utilizador |
| `GET` | `/users/logout` | Autenticado | Termina sessao |

### Rotas Admin

Todas as rotas `/admin` exigem login e role `admin`.

| Metodo | Rota | O que faz |
|---|---|---|
| `GET` | `/admin/dashboard` | Dashboard admin com utilizadores, supermercados ativos, total de encomendas e supermercados pendentes |
| `POST` | `/admin/supermarket/:id/approve` | Aprova supermercado |
| `POST` | `/admin/supermarket/:id/disapprove` | Rejeita supermercado e guarda motivo |
| `GET` | `/admin/users` | Lista utilizadores |
| `GET` | `/admin/categories` | Lista categorias |
| `POST` | `/admin/categories/new` | Cria categoria |
| `GET` | `/admin/coupons` | Lista e cria cupoes |
| `POST` | `/admin/coupons/new` | Cria cupao |
| `POST` | `/admin/coupons/:id/toggle` | Ativa/desativa cupao |
| `GET` | `/admin/createAdmin` | Formulario para criar admin |
| `POST` | `/admin/createAdmin` | Cria utilizador admin |

### Rotas Supermercado

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/supermarket` | Autenticado | Redireciona para `/supermarket/list` |
| `GET` | `/supermarket/dashboard` | Admin, supermercado, estafeta | Redireciona para o dashboard correto ou mostra dashboard de supermercado |
| `GET` | `/supermarket/list` | Autenticado | Lista supermercados visiveis ao perfil |
| `GET` | `/supermarket/new` | Supermercado | Formulario de criacao de supermercado |
| `POST` | `/supermarket/new` | Supermercado | Cria supermercado pendente de aprovacao |
| `GET` | `/supermarket/:id` | Autenticado | Detalhe do supermercado |
| `GET` | `/supermarket/:id/edit` | Supermercado/Admin | Formulario de edicao |
| `POST` | `/supermarket/:id/edit` | Supermercado/Admin | Atualiza supermercado e volta a exigir aprovacao |

### Rotas Produtos

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/supermarket/:supermarketId/products` | Autenticado | Lista produtos com pesquisa e filtro por categoria |
| `GET` | `/supermarket/:supermarketId/products/new` | Supermercado | Formulario para criar produto |
| `POST` | `/supermarket/:supermarketId/products/new` | Supermercado | Cria produto com imagem, categoria, stock e EAN |
| `GET` | `/supermarket/:supermarketId/products/:productId/edit` | Supermercado | Formulario para editar produto |
| `POST` | `/supermarket/:supermarketId/products/:productId/edit` | Supermercado | Atualiza produto |
| `POST` | `/supermarket/:supermarketId/products/:productId/delete` | Supermercado | Remove produto |

### Rotas Encomendas E Vendas

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/orders` | Autenticado | Lista encomendas conforme o perfil |
| `GET` | `/orders/:id` | Autenticado | Mostra detalhe da encomenda |
| `GET` | `/orders/create/:supermarketId` | Supermercado/Admin | Formulario de venda em caixa |
| `POST` | `/orders/create/:supermarketId` | Supermercado/Admin | Cria venda/encomenda |
| `POST` | `/orders/:id/claim` | Estafeta | Aceita entrega e passa para `em_entrega` |
| `POST` | `/orders/:id/status` | Autenticado | Altera estado conforme permissoes |
| `POST` | `/orders/:id/rate` | Cliente | Avalia supermercado e estafeta depois de entregue |

### Rotas Courier/Estafeta

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `GET` | `/courier` | Estafeta | Redireciona para `/courier/dashboard` |
| `GET` | `/courier/dashboard` | Estafeta | Dashboard de entregas |
| `GET` | `/estafeta/dashboard` | Estafeta | Alias antigo para compatibilidade |

### Rotas Pagamentos Stripe

| Metodo | Rota | Acesso | O que faz |
|---|---|---|---|
| `POST` | `/payments/checkout/:orderId` | Cliente/Supermercado/Admin com acesso a encomenda | Cria sessao Stripe Checkout e redireciona para pagamento |
| `GET` | `/payments/success` | Autenticado | Confirma checkout e marca encomenda como paga se a Stripe indicar `paid` |
| `GET` | `/payments/cancel` | Autenticado | Volta do checkout cancelado |
| `POST` | `/payments/webhook` | Stripe | Recebe eventos Stripe, como `checkout.session.completed` |

## Modelos Principais

| Modelo | Funcao |
|---|---|
| `User` | Utilizadores e roles |
| `Supermarket` | Supermercados, aprovacao, localizacao e metodos de entrega |
| `Product` | Produtos, stock, categoria, imagem, supermercado e EAN |
| `Category` | Categorias de produto |
| `Order` | Encomendas, itens, estados, pagamento, cupoes, estafeta e avaliacoes |
| `Coupon` | Cupoes de desconto |

## Como Testar Cada Solucao

### Autenticacao

1. Abrir `/users/register`.
2. Criar utilizador com role pretendida.
3. Fazer login em `/users/login`.
4. Confirmar que o utilizador e redirecionado para a area correta.
5. Fazer logout em `/users/logout`.

### Aprovacao De Supermercados

1. Registar utilizador com role `supermercado`.
2. Fazer login como esse supermercado.
3. Criar supermercado em `/supermarket/new`.
4. Entrar como admin.
5. Abrir `/admin/dashboard`.
6. Aprovar ou rejeitar o supermercado.
7. Confirmar que so supermercados aprovados conseguem operar produtos/vendas.

### Produtos E Categorias

1. Entrar como admin.
2. Criar categorias em `/admin/categories`.
3. Entrar como supermercado aprovado.
4. Abrir `/supermarket/:supermarketId/products`.
5. Criar produto com nome, categoria, preco, stock, imagem e EAN.
6. Testar pesquisa por nome e filtro por categoria.
7. Editar e apagar produtos.

### Venda Em Caixa

1. Entrar como supermercado aprovado.
2. Abrir dashboard ou detalhe de supermercado.
3. Ir para `/orders/create/:supermarketId`.
4. Escolher produtos e quantidades.
5. Criar cliente novo ou selecionar cliente existente.
6. Escolher metodo de entrega.
7. Opcionalmente aplicar cupao.
8. Confirmar venda.
9. Ver detalhe da encomenda criada.
10. Confirmar que stock foi atualizado.

### Leitor De Codigo De Barras

1. No formulario de nova venda, preencher o campo de codigo de barras.
2. Inserir o EAN de um produto existente.
3. Premir `Enter`.
4. O produto deve ser selecionado automaticamente e a quantidade atualizada.

### Estados Da Encomenda

Estados disponiveis:

```text
pendente -> confirmada -> em_preparacao -> em_entrega -> entregue
```

Tambem existe:

```text
cancelada
```

Regras principais:

- Supermercado/admin podem preparar, entregar ou cancelar conforme o estado.
- Estafeta so aceita encomendas com entrega por estafeta em `em_preparacao`.
- Estafeta so pode ter uma entrega `em_entrega` de cada vez.
- Ao cancelar, o stock reservado e reposto.

### Estafeta

1. Entrar com utilizador role `estafeta`.
2. Abrir `/courier/dashboard`.
3. Ver encomendas confirmadas a aguardar preparacao.
4. Quando uma encomenda passar para `em_preparacao`, abrir detalhe.
5. Clicar `Aceitar entrega`.
6. Confirmar que passa para `em_entrega`.
7. Marcar como `entregue`.

### Cliente

1. Entrar como cliente.
2. Abrir `/supermarket/list`.
3. Consultar supermercados e produtos.
4. Abrir `/orders`.
5. Consultar historico de encomendas associadas ao cliente.
6. Depois de uma encomenda estar `entregue`, avaliar supermercado e estafeta.

### Dashboard Supermercado

Entrar como supermercado e abrir:

```text
/supermarket/dashboard
```

O dashboard mostra:

- Numero total de encomendas.
- Encomendas ativas.
- Encomendas entregues.
- Total vendido.
- Produtos mais vendidos.
- Supermercados geridos.
- Ultimas encomendas.

### Dashboard Estafeta

Entrar como estafeta e abrir:

```text
/courier/dashboard
```

O dashboard mostra:

- Numero de entregas.
- Entregas a aguardar preparacao.
- Entregas disponiveis.
- Entrega em curso.
- Entregas concluidas.
- Supermercados com mais entregas.
- Lista recente de entregas.

### Dashboard Admin

Entrar como admin e abrir:

```text
/admin/dashboard
```

O dashboard mostra:

- Numero de utilizadores.
- Supermercados ativos.
- Total de encomendas.
- Supermercados pendentes.
- Acoes de aprovar/rejeitar supermercados.
- Links para categorias, cupoes e utilizadores.

### Cupoes

1. Entrar como admin.
2. Abrir `/admin/coupons`.
3. Criar cupao.
4. Escolher tipo:
   - `percent`: desconto percentual.
   - `fixed`: desconto fixo em euros.
   - `free_shipping`: desconto no custo de entrega.
5. Definir validade, limite de usos, valor minimo e supermercado opcional.
6. Na venda em caixa, inserir o codigo do cupao.
7. Confirmar desconto no detalhe da encomenda.

### Emails

Configuracao no `.env`:

```env
MAIL_SERVICE=gmail
MAIL_USER=email_de_teste@gmail.com
MAIL_PASS=app_password_do_gmail
MAIL_FROM=Marketplace <email_de_teste@gmail.com>
```

Como testar:

1. Reiniciar servidor depois de configurar o `.env`.
2. Criar uma encomenda.
3. Confirmar que o cliente recebe email de confirmacao.
4. Alterar estado da encomenda.
5. Confirmar novo email ao cliente.

Eventos que enviam email:

- Encomenda criada.
- Alteracao de estado.
- Estafeta aceita entrega e passa para `em_entrega`.

### Stripe Checkout

Configuracao minima no `.env`:

```env
APP_BASE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=
```

Teste rapido sem webhook:

1. Criar ou abrir uma encomenda.
2. Clicar `Pagar com Stripe`.
3. Usar cartao de teste:

```text
4242 4242 4242 4242
```

4. Usar qualquer data futura e qualquer CVC.
5. Confirmar que volta para a encomenda com `payment=success`.
6. Confirmar que o estado de pagamento ficou `Pago`.

Teste com webhook:

1. Instalar Stripe CLI.
2. Fazer login:

```powershell
stripe login
```

3. Ouvir webhooks locais:

```powershell
stripe listen --forward-to localhost:3000/payments/webhook
```

4. Copiar o valor `whsec_...` para:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Reiniciar o servidor.
6. Fazer novo pagamento de teste.

## Regras De Negocio Implementadas

| Regra | Estado |
|---|---|
| Supermercado so pode vender depois de aprovado | Implementado |
| Stock nao pode ficar negativo | Implementado |
| Venda deve ter pelo menos um produto | Implementado |
| Produtos da venda pertencem ao supermercado selecionado | Implementado |
| Cliente e validado/criado automaticamente na venda em caixa | Implementado |
| Cliente existente pode ser associado a venda | Implementado |
| Cupao e validado antes da encomenda ser criada | Implementado |
| Cupao incrementa contador de uso | Implementado |
| Cancelamento repoe stock e liberta uso do cupao | Implementado |
| Estafeta so aceita encomenda em preparacao | Implementado |
| Estafeta so tem uma entrega em curso | Implementado |
| Cliente so ve as suas encomendas | Implementado |
| Supermercado so ve encomendas dos supermercados que gere | Implementado |
| Pagamento Stripe so fica pago com confirmacao da Stripe | Implementado |

## Comandos Uteis

Instalar dependencias:

```powershell
npm install
```

Arrancar app:

```powershell
npm start
```

Ver branch atual:

```powershell
git branch --show-current
```

Ver estado do Git:

```powershell
git status
```

Trazer Features para a branch atual:

```powershell
git fetch origin
git merge origin/Features
```

Enviar branch atual:

```powershell
git push
```

## Variaveis De Ambiente

| Variavel | Obrigatoria | Funcao |
|---|---|---|
| `MONGODB_URI` | Sim | Ligacao MongoDB |
| `MONGODB_DB` | Sim | Nome da base de dados |
| `PORT` | Nao | Porta local |
| `APP_BASE_URL` | Sim para email/Stripe | URL base da app |
| `MAIL_SERVICE` | Sim para email | Servico SMTP, por exemplo `gmail` |
| `MAIL_USER` | Sim para email | Conta emissora |
| `MAIL_PASS` | Sim para email | App Password SMTP |
| `MAIL_FROM` | Sim para email | Remetente visivel |
| `MAIL_HOST` | Alternativa | Host SMTP manual |
| `MAIL_PORT` | Alternativa | Porta SMTP manual |
| `MAIL_SECURE` | Alternativa | Ligacao segura SMTP |
| `STRIPE_SECRET_KEY` | Sim para Stripe | Chave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Recomendado | Segredo do webhook Stripe |

## Observacoes Importantes

- O ficheiro `.env` deve existir localmente para a app funcionar.
- Nao usar passwords pessoais no reposititorio.
- Se o grupo usar uma conta de teste comum para email/Stripe, garantir que todos sabem que essas credenciais sao partilhadas.
- O webhook Stripe deve ser registado antes de `express.json()`, por isso esta montado diretamente em `app.js`.
- O projeto usa `body-parser.raw()` no webhook porque a versao atual do Express nao suporta `express.raw()`.
- Imagens de produtos ficam em `public/uploads/products`.
- Alguns textos no codigo podem aparecer com caracteres estranhos se forem editados com codificacao diferente; manter ficheiros em UTF-8.

## Entrega E Demonstracao Recomendada

Fluxo completo para demonstrar:

1. Login como admin.
2. Aprovar supermercado.
3. Criar categoria.
4. Login como supermercado.
5. Criar produto com stock e EAN.
6. Criar venda em caixa.
7. Aplicar cupao.
8. Ver encomenda criada.
9. Pagar com Stripe.
10. Alterar estado para `em_preparacao`.
11. Login como estafeta.
12. Aceitar entrega.
13. Marcar como entregue.
14. Login como cliente.
15. Consultar encomenda.
16. Avaliar supermercado/estafeta.
17. Confirmar emails recebidos.

## Estado Do Projeto

O projeto esta funcional para demonstracao do milestone 1 e inclui varias funcionalidades extra de bonificacao:

- Cupoes.
- Emails.
- Stripe Checkout.
- Avaliacoes.
- Dashboards com estatisticas.
- Geolocalizacao/mapas.
- Leitor de codigo de barras por EAN.


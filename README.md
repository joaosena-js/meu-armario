# Meu Armário

Aplicação web de estoque doméstico. Controla o que existe em casa, monta a lista "Tem que comprar", registra as compras no mercado com o histórico de preços e compara embalagens pelo preço por kg, litro ou unidade.

Feita para o celular em primeiro lugar, funciona também em tablets e computadores.

Tecnologias: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Supabase (Auth, PostgreSQL, Storage), React Hook Form, Zod, Lucide, date-fns e Vitest. Gerenciador de pacotes: npm.

A arquitetura, o modelo do banco e o plano de implementação estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Funcionalidades do MVP

| Tela | O que faz |
| --- | --- |
| Início | Saudação, total de produtos, acabando, acabados, itens para comprar, gasto do mês e últimas compras. Cartões levam à tela correspondente. |
| Meu Armário | Cartões no celular e cartões ou tabela no computador. Pesquisa, filtros por categoria e estado, ordenação, aumentar e diminuir quantidade, marcar como acabando ou acabou, adicionar à lista, histórico de preços e exclusão. |
| Cadastro de produto | Produto, estoque, embalagem, foto opcional e compra opcional. Tudo gravado em uma única transação no banco. |
| Tem que comprar | Itens automáticos (acabou ou estoque baixo) e manuais, com prioridade, observação, marcação como comprado e seleção para iniciar a compra. |
| Comprar (modo mercado) | Mercado, data e itens; cabeçalho fixo com total e progresso; carrinho salvo no aparelho; estoque atualizado só na finalização; resumo com variação de preço. |
| Mercados | Cadastro e página com compras, total gasto, ticket médio, última compra e preço médio por produto. |
| Histórico | Filtro por período e mercado, detalhes da compra com preço normalizado e "Repetir produtos em nova lista". |
| Comparador | Duas a dez opções, somente com unidades compatíveis; melhor custo-benefício, menor preço total, maior embalagem e economia percentual. |
| Configurações | Nome, inclusão automática na lista e tema claro, escuro ou do aparelho. |

## Executar localmente

Pré-requisitos: Node.js 20.9 ou superior e uma conta gratuita no [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
# preencha .env.local com a URL e a chave publicável do Supabase
npm run dev
```

Acesse http://localhost:3000.

### Variáveis de ambiente

| Variável | Obrigatória | Onde encontrar |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Supabase > Project Settings > Data API > Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Supabase > Project Settings > API Keys > Publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_SITE_URL` | Não | URL pública do app. Usada nos links de confirmação e recuperação de senha. Sem ela, o app usa o endereço da requisição. |

A chave publicável pode ficar no navegador porque o acesso aos dados é controlado pelo Row Level Security. A service role key (ou secret key) não é usada neste projeto e nunca deve ser colocada no `.env.local` nem na Vercel.

## Criar o projeto no Supabase

1. Crie um projeto em https://supabase.com/dashboard (região sugerida: South America, São Paulo).
2. Aplique as migrations, em ordem, por um destes caminhos:
   - **SQL Editor**: abra cada arquivo de `supabase/migrations/` em ordem numérica, cole e execute. Depois execute `supabase/seed.sql`.
   - **Supabase CLI**:
     ```bash
     npx supabase login
     npx supabase link --project-ref SEU_PROJECT_REF
     npx supabase db push
     ```
3. Em **Authentication > URL Configuration**, defina:
   - Site URL: `http://localhost:3000` (depois troque pela URL da Vercel).
   - Redirect URLs: `http://localhost:3000/**` e `https://SEU-APP.vercel.app/**`.
4. Em **Authentication > Emails > Templates**, ajuste os links para o fluxo com `token_hash` (recomendado para SSR):
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`
5. Confira em **Table Editor** que todas as tabelas aparecem com RLS ativo, e em **Storage** que o bucket `product-images` foi criado.

O e-mail padrão do Supabase tem limite baixo de envios por hora. Para uso real, configure um SMTP próprio em Authentication > Emails > SMTP Settings.

### Supabase local (opcional, requer Docker)

```bash
npx supabase start      # aplica migrations e seed
npx supabase status     # mostra URL e chave publicável locais
```

## Publicar na Vercel

1. Envie o projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New > Project** e importe o repositório. O framework Next.js é detectado automaticamente.
3. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` (com a URL de produção).
4. Clique em **Deploy**.
5. Volte ao Supabase e adicione a URL da Vercel em Site URL e Redirect URLs (passo 3 da seção anterior).
6. Teste cadastro, login e recuperação de senha na URL publicada.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos das rotas e roda o TypeScript |
| `npm test` | Testes unitários (Vitest) |
| `npm run build` | Build de produção |
| `npm run check` | Executa lint, typecheck, testes e build em sequência |

Os testes do banco (RLS e regras de negócio) estão em `supabase/tests/`. Veja [supabase/tests/README.md](supabase/tests/README.md).

## Estrutura de pastas

```
src/
  app/
    (auth)/            login, cadastro, recuperar-senha, redefinir-senha
    (dashboard)/       início, armario, tem-que-comprar, comprar, comparador,
                       mercados, historico, configuracoes
    auth/              confirm (links de e-mail) e erro
  actions/             Server Actions (validam com Zod e gravam no Supabase)
  components/
    ui/                componentes shadcn/ui
    layout/            barra lateral, barra inferior, cabeçalhos, estados vazios
    inventory/ products/ shopping/ purchases/ comparator/ stores/ settings/ auth/ dashboard/
  hooks/               hooks de cliente
  lib/
    calculations/      unidades, preço normalizado, comparador, dinheiro em centavos (com testes)
    constants/         valores de domínio e navegação
    formatters/        moeda R$ 0,00 e datas DD/MM/AAAA
    queries/           leituras no servidor (server-only)
    storage/           envio de fotos com validação
    supabase/          clientes do navegador, do servidor e do proxy
    validations/       esquemas Zod
  types/               tipagens do banco e do domínio
  proxy.ts             renovação de sessão e proteção de rotas
supabase/
  migrations/          esquema, RLS, regras, cadastro inicial e Storage
  seed.sql             categorias e locais iniciais para contas existentes
  tests/               testes SQL
docs/ARQUITETURA.md
```

## Segurança

- RLS ativo em todas as tabelas, com políticas `auth.uid() = user_id`.
- Chaves estrangeiras compostas `(id, user_id)` impedem referenciar dados de outra conta.
- Compras só são gravadas pelas funções `finalize_purchase` e `create_product_with_inventory`, que calculam os totais no banco. A API não aceita inserir, alterar ou excluir compras diretamente.
- Server Actions validam todos os dados com Zod e têm proteção contra CSRF do próprio Next.js (comparação de origem).
- Fotos: até 2 MB, somente JPG, PNG ou WEBP, com conferência da assinatura do arquivo e nome aleatório. Cada usuário grava apenas na própria pasta do bucket. As fotos são públicas para quem tiver a URL; não envie imagens com dados pessoais.
- Mensagens de login e recuperação de senha não revelam se um e-mail possui conta.
- Cabeçalhos de segurança configurados em `next.config.ts`.

## Reservado para versões futuras

Leitura de código de barras pela câmera, importação de nota fiscal, compartilhamento familiar, inteligência artificial, notificações push, funcionamento offline (PWA completo com service worker), controle avançado de validade, exportação em PDF ou Excel, edição e exclusão de compras finalizadas com reversão de estoque, comparação automática entre mercados, itens avulsos no modo mercado, ícones PNG do PWA e paginação no servidor para estoques muito grandes.

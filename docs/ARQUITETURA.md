# Meu Armário: arquitetura, banco de dados e plano

Este documento registra as decisões tomadas antes da implementação do MVP.

## 1. Arquitetura proposta

A aplicação é um monólito Next.js (App Router) hospedado na Vercel, com o Supabase fornecendo autenticação, banco PostgreSQL e armazenamento de fotos. Não existe servidor próprio além das funções serverless da Vercel.

```
Navegador (celular, tablet, computador)
   │  HTML gerado no servidor + componentes interativos
   ▼
Next.js 16 na Vercel
   ├─ proxy.ts ............ renova a sessão do Supabase e protege as rotas privadas
   ├─ Server Components ... leem dados (src/lib/queries) já filtrados pelo RLS
   ├─ Server Actions ...... validam com Zod (src/lib/validations) e gravam (src/actions)
   └─ Client Components ... somente onde há interação (formulários, modo mercado, comparador)
   │  chave publicável + cookie de sessão do usuário
   ▼
Supabase
   ├─ Auth ................ contas, login, recuperação de senha
   ├─ PostgreSQL .......... tabelas com RLS, funções SQL transacionais, visões
   └─ Storage ............. bucket product-images (pasta por usuário)
```

Decisões principais:

| Decisão | Motivo |
| --- | --- |
| Cliente oficial `@supabase/supabase-js` + `@supabase/ssr`, sem ORM | Exigência da especificação e menos camadas para a equipe aprender. |
| Operações com várias tabelas em funções SQL (`finalize_purchase`, `create_product_with_inventory`) | Cada chamada é uma transação: se algo falha, nada é gravado pela metade. |
| Total da compra calculado no banco e gravação direta em `purchases` bloqueada | Regra 12. O navegador não consegue enviar um total diferente da soma dos itens. |
| Chaves estrangeiras compostas `(id, user_id)` | Impedem que um registro aponte para a categoria, o mercado ou o produto de outro usuário, mesmo conhecendo o id. |
| Estado do estoque calculado por trigger | Regras 1 a 3 valem para qualquer caminho de gravação, inclusive futuros. |
| `cacheComponents` desativado | O Next.js 16 vem com esse modo experimental ligado. Como todas as telas dependem do usuário logado, o modo dinâmico tradicional é mais simples e previsível. Pode ser reavaliado depois. |
| Valores monetários em centavos (inteiros) no TypeScript e `numeric(12,2)` no banco | Evita erros de ponto flutuante (ex.: 0,1 + 0,2). |
| Carrinho do modo mercado salvo no `localStorage` | Se a página recarregar no mercado, o carrinho não se perde. O estoque só muda na finalização (regra 8). |

## 2. Modelo do banco de dados

```
auth.users ─┬─ profiles (1:1)
            ├─ user_settings (1:1)
            ├─ categories ───────┐
            ├─ storage_locations ┼──┐
            ├─ products ◄────────┘  │
            │    ├─ inventory_items ◄┘   (1 por produto nesta versão)
            │    ├─ shopping_list_items  (product_id opcional, custom_name)
            │    └─ purchase_items ──► purchases ──► stores
            └─ (todas as tabelas possuem user_id e RLS)
```

| Tabela | Finalidade | Observações |
| --- | --- | --- |
| profiles | Nome do usuário | Criado por trigger no cadastro. |
| user_settings | Inclusão automática e tema | Uma linha por usuário (`user_id UNIQUE`). |
| categories / storage_locations | Listas editáveis por usuário | Padrões criados no cadastro; nome único por usuário. |
| products | Catálogo do usuário | Nome + marca únicos por usuário. Não pode ser excluído se tiver compras. |
| inventory_items | O que existe em casa | `status` calculado por trigger; `CHECK` garante quantidade 0 ⇔ "acabou". |
| shopping_list_items | Lista "Tem que comprar" | Índice único parcial impede o mesmo produto pendente duas vezes (regra 5). |
| stores | Mercados | Não pode ser excluído se tiver compras. |
| purchases | Compras finalizadas | Sem UPDATE/DELETE para o usuário nesta versão. |
| purchase_items | Itens e histórico de preços | Imutáveis. Guardam preço normalizado por kg, litro ou unidade. |

Visões de apoio (todas com `security_invoker`, portanto respeitam o RLS): `product_last_purchase`, `product_price_stats`, `store_stats` e `store_product_prices`.

Valores de domínio ficam em inglês no banco e são traduzidos na interface:

| Campo | Valores |
| --- | --- |
| inventory_items.status | available, low_stock, out_of_stock |
| shopping_list_items.priority | low, normal, high, urgent |
| shopping_list_items.reason | out_of_stock, low_stock, manual |
| shopping_list_items.status | pending, purchased |
| user_settings.theme | light, dark, system |

## 3. Plano de implementação

| Etapa | Entrega | Situação |
| --- | --- | --- |
| 1 | Projeto Next.js, Tailwind, shadcn/ui, ESLint, Vitest | Concluída |
| 2 | Migrations, RLS, funções, visões, seed e testes SQL | Concluída |
| 3 | Autenticação (login, cadastro, recuperação, sair) e proteção de rotas | Concluída |
| 4 | Layout responsivo (barra inferior no celular, lateral no computador) e temas | Concluída |
| 5 | Cálculos (unidades, preço normalizado, economia, estado) com testes unitários | Concluída |
| 6 | Cadastro de produto e Meu Armário | Concluída |
| 7 | Tem que comprar | Concluída |
| 8 | Mercados | Concluída |
| 9 | Comprar (modo mercado) e finalização | Concluída |
| 10 | Histórico, comparador, configurações e tela inicial | Concluída |
| 11 | Lint, tipos, testes, build e documentação | Concluída |

## 4. Fora do MVP

Leitura de código de barras pela câmera, importação de nota fiscal, compartilhamento familiar, inteligência artificial, notificações push, funcionamento offline, controle avançado de validade, exportação PDF/Excel, edição ou exclusão de compras finalizadas e comparação automática entre mercados.

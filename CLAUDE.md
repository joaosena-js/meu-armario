@AGENTS.md

# Meu Armário: orientações para agentes

Sistema de estoque doméstico em Next.js 16 (App Router) + Supabase. Interface em português do Brasil, mobile-first. Leia `docs/ARQUITETURA.md` antes de mudanças estruturais.

## Regras do projeto

- Sem ORM: use o cliente oficial do Supabase (`src/lib/supabase/server.ts` no servidor, `client.ts` no navegador).
- Nunca use a service role key. Toda leitura e escrita acontece com a sessão do usuário e passa pelo RLS.
- Leituras ficam em `src/lib/queries` (com `import "server-only"`). Gravações ficam em `src/actions` e sempre validam a entrada com os esquemas de `src/lib/validations`.
- Operações que tocam várias tabelas devem ser funções SQL em uma migration nova (uma transação), como `finalize_purchase`.
- Nunca edite uma migration já aplicada. Crie um arquivo novo em `supabase/migrations/` com prefixo de data e hora.
- Ao alterar o banco, atualize `src/types/database.ts` (as colunas com CHECK usam uniões literais escritas à mão) e os testes em `supabase/tests/`.
- Valores monetários no TypeScript são centavos inteiros (`src/lib/calculations/money.ts`). No banco, `numeric(12,2)`.
- Datas `DATE` chegam como `AAAA-MM-DD`; formate com `formatDate` (usa `parseISO`, sem deslocar o dia).
- Valores de domínio ficam em inglês no banco (`out_of_stock`, `urgent`) e os rótulos em `src/lib/constants/domain.ts`.
- Compras finalizadas são imutáveis nesta versão (sem políticas de UPDATE/DELETE).
- `cacheComponents` está desativado de propósito em `next.config.ts`.
- `proxy.ts` substitui o antigo `middleware.ts` no Next.js 16.
- Componentes shadcn/ui ficam em `src/components/ui`. Mantenha o estilo existente (tokens de cor em `globals.css`).

## Estilo de texto da interface

Português do Brasil, frases curtas, sem travessão e sem emoji. Moeda `R$ 0,00`, datas `DD/MM/AAAA`. Estados do estoque: Disponível (verde), Acabando (amarelo), Acabou (vermelho).

## Antes de concluir uma alteração

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

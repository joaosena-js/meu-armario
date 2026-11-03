# Testes do banco

`01_business_rules_test.sql` verifica RLS, estados do estoque, lista sem duplicidade,
finalização de compra, total calculado no servidor e imutabilidade do histórico.

## Opção 1: PostgreSQL comum (sem Docker)

Use um banco vazio e descartável. O arquivo `00_local_supabase_stub.sql` cria versões
mínimas dos esquemas `auth` e `storage` do Supabase.

```bash
createdb armario_teste
psql -d armario_teste -v ON_ERROR_STOP=1 -f supabase/tests/00_local_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -d armario_teste -v ON_ERROR_STOP=1 -f "$f"; done
psql -d armario_teste -f supabase/tests/01_business_rules_test.sql
```

A última linha deve exibir `TODOS OS TESTES SQL PASSARAM`.

## Opção 2: Supabase local (Docker)

`npx supabase start` aplica as migrations e o `seed.sql` automaticamente.
Não execute o arquivo de stub no Supabase.

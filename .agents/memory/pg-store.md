---
name: PostgreSQL store
description: Armazenamento migrado de JSON file para PostgreSQL via tabela store_state JSONB
---

## Regra
Todos os dados (documentos, chaves API, estabelecimentos, owner, verificações) vivem na tabela `store_state` no PostgreSQL do Replit — uma linha com coluna `data JSONB`.

**Why:** arquivo JSON (`data/store.json`) sumia a cada restart no Cloud Run (efêmero). PostgreSQL persiste independente de deployment target.

## How to apply
- `readStore()` / `writeStore()` / `nextToken()` / `getOwner()` / `saveOwner()` são todas **async** — sempre usar `await`
- `nextToken()` usa UPDATE atômico no banco para evitar duplicatas de token
- Pool de conexão: `pg.Pool` com `process.env.DATABASE_URL`
- A tabela é criada automaticamente na primeira conexão (`ensureTable()`)
- `uuid()` continua síncrono — não toca o banco

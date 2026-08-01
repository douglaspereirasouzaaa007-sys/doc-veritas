---
name: Deployment config
description: Configuração de deployment e porta do servidor de produção
---

## Regra
- `deploymentTarget = "vm"` no `.replit` — disco persistente
- Comando de run: `NITRO_PORT=5000 node .output/server/index.mjs`
- `vite.config.ts`: `nitro: { preset: "node-server", runtimeConfig: { nitro: { port: 5000 } } }`

**Why:** Cloud Run é efêmero (dados sumiam). Nitro default é porta 3000; deployment espera porta 5000.

## How to apply
Nunca usar `cloudrun` como deploymentTarget neste projeto. Sempre garantir NITRO_PORT=5000 no comando de run.

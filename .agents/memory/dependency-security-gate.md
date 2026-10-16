---
name: Dependency security gate
description: Diagnóstico de bloqueios críticos de dependências durante a publicação.
---

Ao corrigir um bloqueio de segurança da publicação, confira as versões efetivamente resolvidas no `bun.lock`, incluindo cópias transitivas e aninhadas. Atualizar apenas o pacote direto pode deixar uma versão vulnerável transitiva no lockfile; use um override quando o range do pacote pai permitir a versão corrigida.

**Why:** O scanner de publicação rejeita builds com vulnerabilidades críticas, e uma instalação pode manter cópias transitivas antigas mesmo após atualizar o TanStack Start.

**How to apply:** Use o erro do build para identificar os advisories e versões mínimas corrigidas; atualize os pais diretos, verifique todas as versões resolvidas, rode auditoria, testes, TypeScript e build antes de pedir uma nova publicação.

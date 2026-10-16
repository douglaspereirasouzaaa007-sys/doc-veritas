---
name: Deployment config
description: Configuração de deployment e porta do servidor de produção
---

Manter VM como destino e porta 5000 explícita no servidor Nitro; não trocar o destino como correção implícita.

**Why:** VM é a escolha histórica deste projeto e o proxy espera porta 5000, não a porta padrão do Nitro.

**How to apply:** Preservar o destino ao corrigir a publicação e testar o comando de execução do artefato compilado, além do build.

Usar o Bun disponível para executar o artefato de produção. A presença de um módulo Node na configuração não prova que o executável esteja disponível.

**Why:** O ambiente declarou Node como instalado, mas o executável estava ausente tanto no shell quanto na publicação, causando saída 127. O mesmo artefato foi validado com Bun.

**How to apply:** Não voltar a depender de `node` sem verificar sua disponibilidade no runtime publicado. Validar o artefato com o runtime efetivamente usado.

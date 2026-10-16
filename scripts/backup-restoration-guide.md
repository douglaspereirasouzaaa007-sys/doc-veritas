# Backup de documentos — Memed Solutions

## O que foi salvo

- `documentos/documentos.json`: os 4.099 documentos completos, com os campos originais do banco de produção. É a fonte para restauração, sem alterações em IDs, tokens ou códigos.
- `documentos/documentos.csv`: cópia para consulta em planilha, separada por ponto e vírgula. Células potencialmente interpretadas como fórmulas são protegidas; não usar o CSV para restauração.
- `qr/png/`: 4.099 QR Codes em PNG, com largura configurada em 512 pixels.
- `qr/svg/`: 4.099 QR Codes em SVG.
- `links-e-qr-codes.csv`: relação de documentos, endereços e arquivos QR.
- `manifesto.json`: associação exata de cada documento às imagens e seus hashes SHA-256.
- `conferencia.json`: contagens, identificadores repetidos e limites mínimos sugeridos dos contadores.
- `SHA256SUMS.txt`: hashes de todos os arquivos acima para detectar corrupção.

Não contém cadastro/senha do dono, valores de chaves de API, histórico de verificações ou coleção de estabelecimentos. Alguns documentos mantêm IDs de referência originais, inclusive de estabelecimentos e chaves, mas não os segredos associados.

Os QR Codes foram gerados novamente a partir dos endereços armazenados, usando os parâmetros atuais do aplicativo. Não são cópias de arquivos binários históricos, pois o sistema gera essas imagens sob demanda. Preservam o conteúdo do link, mas não se promete identidade visual/binária com imagens antigas.

As páginas públicas são montadas pelo aplicativo a partir desses dados. Este pacote não contém PDFs, capturas de tela ou uma cópia HTML offline das páginas.

## Segurança

Este pacote contém dados pessoais e médicos. Guarde em local privado, preferencialmente criptografado. Não envie para GitHub, não coloque em pasta pública e não compartilhe links de download. O ZIP não possui senha nem criptografia.

Mantenha pelo menos duas cópias independentes. O arquivo foi excluído do versionamento e da publicação deste projeto por regras de ignore.

## Antes de fazer o Remix

1. Baixe o ZIP e mantenha o projeto original e seu banco intactos.
2. Extraia o ZIP e confira que existem 4.099 arquivos PNG e 4.099 arquivos SVG.
3. Confira os hashes, se tiver uma ferramenta compatível. Em Linux: `sha256sum -c SHA256SUMS.txt`, dentro da pasta extraída.
4. Faça o Remix pelo menu do projeto. Não presuma que ele copia banco de produção, segredos, publicação ou domínio.

## Restauração segura no Remix

1. Faça upload privado deste ZIP no Remix. Não comite o arquivo nem os dados descompactados.
2. Peça ao agente do Remix:

   “Este ZIP contém somente meus documentos de produção e os QR Codes. Restaure documentos/documentos.json no banco de DESENVOLVIMENTO deste Remix, mantendo exatamente todos os campos, IDs, tokens e códigos. Antes de gravar, confira o SHA-256 com o manifesto e verifique se o banco de destino está vazio. Se não estiver vazio, pare e apresente os conflitos; não sobrescreva nem apague dados. Preserve as outras coleções existentes. Inicialize os contadores a partir dos tokens existentes para não reiniciar a numeração. Leia conferencia.json: existem identificadores repetidos. Não renumere nem remova esses documentos automaticamente. Corrija a concorrência de gravações para não perder novos documentos ou reutilizar tokens. Não execute migrações manuais em produção.”

3. Cadastre o dono no novo sistema pelo fluxo de autenticação. As credenciais antigas não fazem parte deste backup. Crie as novas chaves de API necessárias.
4. Verifique as 4.099 linhas restauradas e a igualdade dos campos com o JSON. Confira buscas, filtros, páginas públicas e QR Codes.
5. Resolva a ambiguidade dos identificadores repetidos antes de considerar a restauração concluída. Um endereço idêntico não pode identificar dois documentos diferentes sem uma estratégia adicional. Preserve os links antigos e decida explicitamente como tratar os conflitos.
6. Verifique o processo de publicação do banco: não presuma que dados importados em desenvolvimento serão copiados para um banco de produção já existente. Confirme a inicialização de dados oferecida pelo Replit antes de publicar. Não aceite operações destrutivas de esquema.
7. Publique a cópia no endereço temporário fornecido pelo Replit e confira o banco de PRODUÇÃO por leitura, antes de transferir o domínio. Se não houver os 4.099 documentos, pare e resolva a transferência de dados pelo fluxo suportado.

## Mesmo domínio: preservar links

1. Mantenha `https://memedsolutions.com` como URL pública configurada para o aplicativo final.
2. Primeiro valide a cópia pelo endereço temporário. Os PNGs/SVGs deste backup já apontam para o domínio definitivo, não para o endereço temporário.
3. Só quando a cópia estiver validada, desvincule o domínio da publicação antiga e vincule-o à nova, seguindo as instruções DNS do Replit. Pode haver indisponibilidade durante a mudança.
4. Aguarde a validação do domínio e do HTTPS. Teste a página inicial, o painel e diversos links `/d/<codigo>`, de diferentes tipos de documento.
5. Escaneie QR Codes do pacote e também exemplares antigos já distribuídos.
6. Não exclua o projeto/banco original até concluir a conferência e manter as cópias externas.

Manter o domínio é necessário, mas não suficiente: os mesmos caminhos e os dados correspondentes também devem continuar disponíveis. Este backup não reativa uma publicação suspensa.

## Limite da conferência

O backup representa os 4.099 documentos encontrados na leitura de produção. A integridade foi conferida contra o conteúdo exportado, sem alterar o banco. Isso não comprova a existência de documentos que tenham sido perdidos antes da exportação.

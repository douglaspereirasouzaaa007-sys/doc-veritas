import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from "@/lib/admin.functions";
import { formatDateTimeBR, formatNumberBR } from "@/lib/br";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/painel/api")({
  component: ApiPage,
});

function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-primary p-4 text-xs leading-relaxed text-primary-foreground">
        <code>{children}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 text-primary-foreground hover:bg-white/10"
        onClick={() => {
          navigator.clipboard.writeText(children);
          toast.success("Copiado!");
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: string;
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="font-mono">{method}</Badge>
        <code className="font-mono text-sm text-primary">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
    </div>
  );
}

function ApiPage() {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const qc = useQueryClient();

  const fetchKeys = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const update = useServerFn(updateApiKey);
  const remove = useServerFn(deleteApiKey);

  const { data } = useQuery({ queryKey: ["api-keys"], queryFn: () => fetchKeys({}) });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name } }),
    onSuccess: (res) => {
      setNewKey(res.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baseUrl = PUBLIC_SITE_URL;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">API e chaves</h1>
        <p className="text-sm text-muted-foreground">
          Integre outro sistema para emitir documentos, gerar QR Codes e páginas de verificação.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Chaves de API</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <Input
            required
            minLength={2}
            placeholder="Nome da integração (ex.: ERP da clínica)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" disabled={createMutation.isPending}>
            Gerar nova chave
          </Button>
        </form>

        {newKey ? (
          <div className="mt-4 rounded-lg border border-brand-orange bg-peach-soft/60 p-4">
            <p className="text-sm font-medium text-primary">
              Copie sua chave agora — ela não será exibida novamente.
            </p>
            <div className="mt-2">
              <Code>{newKey}</Code>
            </div>
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Prefixo</th>
                <th className="py-2 pr-4">Requisições</th>
                <th className="py-2 pr-4">Último uso</th>
                <th className="py-2 pr-4">Ativa</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Nenhuma chave criada.
                  </td>
                </tr>
              ) : (
                data?.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium text-primary">{row.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{row.key_prefix}…</td>
                    <td className="py-3 pr-4">{formatNumberBR(row.requests_count ?? 0)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.last_used_at ? formatDateTimeBR(row.last_used_at) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Switch
                        checked={row.active}
                        onCheckedChange={async (v) => {
                          await update({ data: { id: row.id, active: v } });
                          qc.invalidateQueries({ queryKey: ["api-keys"] });
                        }}
                      />
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm("Excluir esta chave?")) return;
                          await remove({ data: { id: row.id } });
                          qc.invalidateQueries({ queryKey: ["api-keys"] });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-primary">Documentação da API</h2>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-primary">Autenticação</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Envie sua chave no header <code className="font-mono">x-api-key</code> (ou{" "}
            <code className="font-mono">Authorization: Bearer &lt;chave&gt;</code>). Todas as
            respostas são JSON com CORS liberado. URL base:{" "}
            <code className="font-mono">{baseUrl}/api/public/v1</code>
          </p>
          <div className="mt-4">
            <Code>{`curl ${baseUrl}/api/public/v1/documents \\
  -H "x-api-key: dv_live_sua_chave_aqui"`}</Code>
          </div>
        </div>

        <Endpoint
          method="POST"
          path="/api/public/v1/documents"
          description="Cria um documento e devolve o token (ex.: ATE-161), o código de acesso, o QR Code e a URL da página profissional."
        >
          <Code>{`curl -X POST ${baseUrl}/api/public/v1/documents \\
  -H "x-api-key: dv_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "atestado",
    "patient_name": "Maria Aparecida da Silva",
    "patient_cpf": "123.456.789-09",
    "patient_birth_date": "1985-04-12",
    "establishment_name": "Clínica Vida Plena",
    "establishment_address": "Av. Paulista, 1000 • Bela Vista • São Paulo - SP • CEP 01310-100",
    "professional_name": "Dra. Ana Souza",
    "professional_council": "CRM",
    "professional_council_number": "123456/SP",
    "professional_specialty": "Clínica Médica",
    "leave_start_date": "2026-03-10",
    "leave_end_date": "2026-03-12",
    "leave_days": 3,
    "cid": "J11",
    "body_text": "Atesto para os devidos fins que a paciente necessita de afastamento de suas atividades por 3 (três) dias."
  }'`}</Code>
          <p className="text-sm text-muted-foreground">Resposta (201):</p>
          <Code>{`{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "token": "ATE-10001",
    "code": "847291",
    "type": "atestado",
    "status": "valido",
    "...": "..."
  },
  "token": "ATE-10001",
  "access_code": "847291",
  "document_id": "11111111-1111-4111-8111-111111111111",
  "verification_url": "${baseUrl}/d/11111111-1111-4111-8111-111111111111",
  "token_url": "${baseUrl}/d/ATE-10001",
  "qrcode_url": "${baseUrl}/api/public/v1/qrcode/11111111-1111-4111-8111-111111111111"
}`}</Code>
          <p className="text-sm text-muted-foreground">
            Use o ID individual e os links retornados pela API. Consultas por código e token
            continuam disponíveis quando identificam um único documento. Identificadores
            históricos repetidos retornam 409, sem selecionar um paciente arbitrariamente.
            Novas emissões reservam código e token exclusivos na mesma transação.
          </p>
        </Endpoint>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-primary">
            Endpoints por tipo de documento
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada tipo tem seu próprio endpoint. Nesses endpoints o campo{" "}
            <code className="font-mono">type</code> é opcional — ele é definido automaticamente.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4">Coleção</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2">Token</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["Atestados", "/api/public/v1/atestados", "ATE-161"],
                  ["Receitas", "/api/public/v1/receitas", "REC-22144"],
                  ["Laudos", "/api/public/v1/laudos", "LAU-16105"],
                  ["Exames", "/api/public/v1/exames", "EXA-101"],
                  ["Declarações", "/api/public/v1/declaracoes", "DEC-101"],
                ].map(([label, path, token]) => (
                  <tr key={path} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-primary">{label}</td>
                    <td className="py-2 pr-4 font-mono text-xs">GET · POST {path}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      GET · PATCH · DELETE {path}/{"{token}"}
                    </td>
                    <td className="py-2 font-mono text-xs">{token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Endpoint
          method="POST"
          path="/api/public/v1/atestados"
          description="Cria um atestado. Aceita dados em formato brasileiro (datas DD/MM/AAAA, CPF com máscara)."
        >
          <Code>{`curl -X POST ${baseUrl}/api/public/v1/atestados \\
  -H "x-api-key: dv_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paciente": "Maria Aparecida da Silva",
    "cpf": "123.456.789-09",
    "data_nascimento": "12/04/1985",
    "estabelecimento": "Clínica Vida Plena",
    "endereco": "Av. Paulista, 1000 • São Paulo - SP",
    "medico": "Dra. Ana Souza",
    "crm": "123456/SP",
    "especialidade": "Clínica Médica",
    "cid": "J11",
    "data_inicio": "10/03/2026",
    "data_fim": "12/03/2026",
    "data_emissao": "10/03/2026 09:30",
    "texto": "Atesto para os devidos fins que a paciente necessita de afastamento por 3 (três) dias."
  }'`}</Code>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/public/v1/receitas"
          description="Cria uma receita médica. Os dias de afastamento não se aplicam."
        >
          <Code>{`curl -X POST ${baseUrl}/api/public/v1/receitas \\
  -H "x-api-key: dv_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paciente": "João Carlos Pereira",
    "cpf": "987.654.321-00",
    "data_nascimento": "03/09/1962",
    "medico": "Dr. Rafael Lima",
    "crm": "98765/SP",
    "especialidade": "Cardiologia",
    "texto": "1) Losartana 50mg — 1 comprimido pela manhã, uso contínuo."
  }'`}</Code>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/public/v1/laudos"
          description="Cria um laudo médico com o texto completo do exame/parecer."
        />

        <Endpoint
          method="GET"
          path="/api/public/v1/atestados?limit=20&offset=0&cpf=12345678909&status=valido"
          description="Lista documentos do tipo com paginação e filtros por CPF e status. O mesmo padrão vale para receitas, laudos, exames e declaracoes."
        />

        <Endpoint
          method="GET"
          path="/api/public/v1/documents?limit=20&offset=0&type=atestado&cpf=12345678909"
          description="Lista todos os tipos em um único endpoint, com filtro opcional por tipo."
        />


        <Endpoint
          method="GET"
          path="/api/public/v1/documents/{token-ou-codigo}"
          description="Consulta um documento específico pelo token (ATE-161) ou pelo código de acesso."
        />

        <Endpoint
          method="PATCH"
          path="/api/public/v1/documents/{token-ou-codigo}"
          description="Atualiza campos do documento (inclusive status: valido, revogado ou expirado)."
        >
          <Code>{`curl -X PATCH ${baseUrl}/api/public/v1/documents/847291 \\
  -H "x-api-key: dv_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "revogado"}'`}</Code>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/public/v1/qrcode/{token-ou-codigo}"
          description="Retorna o QR Code do documento em preto e branco. Use ?format=png para PNG e ?size=512 para definir o tamanho."
        />

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-primary">Campos aceitos</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Campo</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2">Descrição</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["token", "gerado", "Token do documento (ATE-161, REC-22144, LAU-16105) — somente leitura"],
                  ["code", "gerado", "Código de acesso de 12 caracteres — somente leitura"],
                  ["type", "enum", "atestado, receita, laudo, exame ou declaracao (opcional nos endpoints por tipo)"],
                  ["status", "enum", "valido (padrão), revogado ou expirado"],
                  ["patient_name", "string", "Nome do paciente (obrigatório)"],
                  ["patient_cpf", "string", "CPF do paciente (aceita 123.456.789-09)"],
                  ["patient_birth_date", "DD/MM/AAAA ou AAAA-MM-DD", "Data de nascimento"],
                  ["establishment_id", "uuid", "Estabelecimento cadastrado (preenche nome e endereço)"],
                  ["establishment_name", "string", "Nome do estabelecimento"],
                  ["establishment_address", "string", "Endereço completo"],
                  ["professional_name", "string", "Nome do profissional emissor"],
                  ["professional_council", "string", "Conselho (ex.: CRM)"],
                  ["professional_council_number", "string", "Número/UF do registro"],
                  ["professional_specialty", "string", "Especialidade"],
                  ["body_text", "string", "Texto exibido na página do documento"],
                  ["cid", "string", "CID relacionado (atestados)"],
                  ["leave_start_date", "DD/MM/AAAA ou AAAA-MM-DD", "Início do afastamento"],
                  ["leave_end_date", "DD/MM/AAAA ou AAAA-MM-DD", "Término do afastamento"],
                  ["leave_days", "número", "Dias de afastamento (calculado automaticamente pelas datas)"],
                  ["issued_at", "DD/MM/AAAA HH:mm ou ISO 8601", "Data e horário de emissão (padrão: agora)"],
                  ["metadata", "objeto", "Dados livres do seu sistema"],
                  ["Apelidos aceitos", "string", "texto/text/content → body_text; crm → professional_council_number; paciente/nome_paciente → patient_name; especialidade → professional_specialty; data_nascimento, data_inicio, data_fim, data_emissao, dias, estabelecimento, endereco"],

                ].map(([field, type, desc]) => (
                  <tr key={field} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-primary">{field}</td>
                    <td className="py-2 pr-4">{type}</td>
                    <td className="py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            As datas são armazenadas em ISO (AAAA-MM-DD) e exibidas ao público sempre no formato
            brasileiro (DD/MM/AAAA), com horário no fuso de Brasília.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-primary">Códigos de erro</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>401</strong> — chave de API ausente ou inválida.
            </li>
            <li>
              <strong>403</strong> — chave desativada.
            </li>
            <li>
              <strong>404</strong> — documento não encontrado.
            </li>
            <li>
              <strong>409</strong> — identificador histórico ambíguo; use o ID individual do documento.
            </li>
            <li>
              <strong>422</strong> — dados inválidos (a resposta traz o array{" "}
              <code className="font-mono">issues</code>).
            </li>
            <li>
              <strong>500</strong> — erro interno ao processar a requisição.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

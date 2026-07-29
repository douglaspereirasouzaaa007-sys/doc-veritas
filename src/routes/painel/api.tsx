import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from "@/lib/admin.functions";
import { formatDateTimeBR, formatNumberBR } from "@/lib/br";
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

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://seu-dominio";

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
          description="Cria um documento, gera o código de verificação, o QR Code e a página profissional."
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
  "data": { "code": "ABCD-2345-EFGH", "type": "atestado", "status": "valido", "...": "..." },
  "verification_url": "${baseUrl}/d/ABCD-2345-EFGH",
  "qrcode_url": "${baseUrl}/api/public/v1/qrcode/ABCD-2345-EFGH"
}`}</Code>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/public/v1/documents?limit=20&offset=0&type=atestado&cpf=12345678909"
          description="Lista documentos com paginação e filtros opcionais por tipo e CPF."
        />

        <Endpoint
          method="GET"
          path="/api/public/v1/documents/{codigo}"
          description="Consulta um documento específico pelo código de verificação."
        />

        <Endpoint
          method="PATCH"
          path="/api/public/v1/documents/{codigo}"
          description="Atualiza campos do documento (inclusive status: valido, revogado ou expirado)."
        >
          <Code>{`curl -X PATCH ${baseUrl}/api/public/v1/documents/ABCD-2345-EFGH \\
  -H "x-api-key: dv_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "revogado"}'`}</Code>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/public/v1/qrcode/{codigo}"
          description="Retorna o QR Code do documento em SVG, pronto para impressão ou uso no seu sistema."
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
                  ["type", "enum", "atestado, receita, laudo, exame ou declaracao (obrigatório)"],
                  ["status", "enum", "valido (padrão), revogado ou expirado"],
                  ["patient_name", "string", "Nome do paciente (obrigatório)"],
                  ["patient_cpf", "string", "CPF do paciente"],
                  ["patient_birth_date", "AAAA-MM-DD", "Data de nascimento"],
                  ["establishment_id", "uuid", "Estabelecimento cadastrado (preenche nome e endereço)"],
                  ["establishment_name", "string", "Nome do estabelecimento"],
                  ["establishment_address", "string", "Endereço completo"],
                  ["professional_name", "string", "Nome do profissional emissor"],
                  ["professional_council", "string", "Conselho (ex.: CRM)"],
                  ["professional_council_number", "string", "Número/UF do registro"],
                  ["professional_specialty", "string", "Especialidade"],
                  ["body_text", "string", "Texto exibido na página do documento"],
                  ["cid", "string", "CID relacionado (atestados)"],
                  ["leave_start_date", "AAAA-MM-DD", "Início do afastamento"],
                  ["leave_end_date", "AAAA-MM-DD", "Término do afastamento"],
                  ["leave_days", "número", "Quantidade de dias de afastamento"],
                  ["issued_at", "ISO 8601", "Data e horário de emissão (padrão: agora)"],
                  ["metadata", "objeto", "Dados livres do seu sistema"],
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

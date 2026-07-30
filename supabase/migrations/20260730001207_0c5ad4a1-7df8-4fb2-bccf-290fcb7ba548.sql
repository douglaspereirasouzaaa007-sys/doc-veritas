INSERT INTO public.documents (
  code, type, status, establishment_name, establishment_address,
  patient_name, patient_birth_date, patient_cpf,
  professional_name, professional_council, professional_council_number, professional_specialty,
  body_text, cid, leave_start_date, leave_end_date, leave_days, issued_at
) VALUES
(
  'ATES-TAD2-3456', 'atestado', 'valido',
  'Clínica Vida Integrada - Unidade Paulista',
  'Av. Paulista, 1842, Conjunto 121 - Bela Vista, São Paulo/SP - CEP 01310-200',
  'Mariana Souza Albuquerque', '1991-03-18', '12345678909',
  'Dra. Helena Ribeiro Martins', 'CRM', 'SP 148.320', 'Clínica Médica',
  E'Atesto, para os devidos fins, que a paciente MARIANA SOUZA ALBUQUERQUE, portadora do CPF 123.456.789-09, esteve sob meus cuidados profissionais nesta data, necessitando de afastamento de suas atividades laborais e/ou escolares pelo período de 3 (três) dias, a contar de 27/07/2026.\n\nO presente atestado é emitido em conformidade com a Resolução CFM nº 1.658/2002 e alterações posteriores, e possui assinatura digital padrão ICP-Brasil, com validade em todo o território nacional.',
  'J06.9', '2026-07-27', '2026-07-29', 3, '2026-07-27T09:12:00-03:00'
),
(
  'RECE-TA34-5678', 'receita', 'valido',
  'Clínica Vida Integrada - Unidade Paulista',
  'Av. Paulista, 1842, Conjunto 121 - Bela Vista, São Paulo/SP - CEP 01310-200',
  'Carlos Eduardo Nogueira Lima', '1978-11-02', '98765432100',
  'Dr. Rafael Antunes Camargo', 'CRM', 'SP 132.774', 'Cardiologia',
  E'PRESCRIÇÃO MÉDICA\n\n1) Losartana Potássica 50 mg — 1 comprimido por via oral a cada 12 horas, uso contínuo. (60 comprimidos)\n\n2) Ácido Acetilsalicílico 100 mg — 1 comprimido por via oral após o almoço, uso contínuo. (30 comprimidos)\n\n3) Sinvastatina 20 mg — 1 comprimido por via oral à noite, uso contínuo. (30 comprimidos)\n\nOrientações: manter dieta hipossódica, praticar atividade física leve por 30 minutos ao dia e retornar em 90 dias com exames laboratoriais.\n\nReceita simples válida por 30 dias a partir da data de emissão, assinada digitalmente com certificado ICP-Brasil, nos termos da Lei nº 14.063/2020 e da Portaria SVS/MS nº 344/1998.',
  NULL, NULL, NULL, NULL, '2026-07-28T14:35:00-03:00'
),
(
  'LAUD-2345-6789', 'laudo', 'valido',
  'Centro Diagnóstico Vida Integrada',
  'Rua Vergueiro, 3.185, 4º andar - Vila Mariana, São Paulo/SP - CEP 04101-300',
  'Beatriz Carvalho Nunes', '1965-06-24', '45678912377',
  'Dr. Marcelo Tavares de Lima', 'CRM', 'SP 96.514', 'Radiologia e Diagnóstico por Imagem',
  E'LAUDO DE RADIOGRAFIA DE TÓRAX — PA E PERFIL\n\nIndicação clínica: tosse seca persistente há 3 semanas.\n\nTécnica: radiografia digital do tórax nas incidências póstero-anterior e perfil esquerdo.\n\nAchados:\n- Campos pulmonares com transparência preservada, sem opacidades ou consolidações.\n- Seios costofrênicos livres.\n- Área cardíaca de dimensões normais (índice cardiotorácico dentro dos limites).\n- Estruturas mediastinais centradas, sem alargamento.\n- Arcabouço ósseo sem lesões líticas ou blásticas.\n\nConclusão: exame radiográfico do tórax dentro dos limites da normalidade. Sugere-se correlação clínica e laboratorial.\n\nLaudo assinado digitalmente com certificado ICP-Brasil, com validade legal em todo o território nacional.',
  NULL, NULL, NULL, NULL, '2026-07-29T11:05:00-03:00'
);
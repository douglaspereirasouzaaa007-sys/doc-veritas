CREATE SEQUENCE IF NOT EXISTS public.doc_token_atestado_seq START 100;
CREATE SEQUENCE IF NOT EXISTS public.doc_token_receita_seq START 20000;
CREATE SEQUENCE IF NOT EXISTS public.doc_token_laudo_seq START 16000;
CREATE SEQUENCE IF NOT EXISTS public.doc_token_exame_seq START 3000;
CREATE SEQUENCE IF NOT EXISTS public.doc_token_declaracao_seq START 500;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS token text;

CREATE OR REPLACE FUNCTION public.generate_document_token(_type public.document_type)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
BEGIN
  RETURN CASE _type
    WHEN 'atestado'   THEN 'ATE-' || nextval('public.doc_token_atestado_seq')
    WHEN 'receita'    THEN 'REC-' || nextval('public.doc_token_receita_seq')
    WHEN 'laudo'      THEN 'LAU-' || nextval('public.doc_token_laudo_seq')
    WHEN 'exame'      THEN 'EXA-' || nextval('public.doc_token_exame_seq')
    WHEN 'declaracao' THEN 'DEC-' || nextval('public.doc_token_declaracao_seq')
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_document_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := public.generate_document_token(NEW.type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_set_token ON public.documents;
CREATE TRIGGER documents_set_token
BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_document_token();

UPDATE public.documents SET token = public.generate_document_token(type) WHERE token IS NULL OR token = '';

ALTER TABLE public.documents ALTER COLUMN token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS documents_token_key ON public.documents (token);
CREATE INDEX IF NOT EXISTS documents_code_idx ON public.documents (code);
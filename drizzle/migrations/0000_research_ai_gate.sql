CREATE TABLE public.research_ai_gate (id text PRIMARY KEY, status integer NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_ai_gate TO service_role;
ALTER TABLE public.research_ai_gate ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.research_ai_gate IS 'Server-only terminal AI access state. No client access or personal data.';

-- ============================================================
-- AI Agent Framework
-- ============================================================

CREATE TABLE public.ai_agents (
    id SERIAL PRIMARY KEY,
    code VARCHAR NOT NULL UNIQUE,
    description VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_agent_executions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES public.ai_agents(id),
    user_id UUID,
    driver VARCHAR NOT NULL,
    model VARCHAR NOT NULL DEFAULT '',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status VARCHAR NOT NULL DEFAULT 'running',
    error_message TEXT,
    input_summary JSONB,
    output_summary JSONB,
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_agent_suggestions (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES public.ai_agent_executions(id) ON DELETE CASCADE,
    suggestion_data JSONB NOT NULL,
    confidence REAL,
    reason VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_agent_executions_agent_id ON public.ai_agent_executions(agent_id);
CREATE INDEX idx_ai_agent_executions_status ON public.ai_agent_executions(status);
CREATE INDEX idx_ai_agent_suggestions_execution_id ON public.ai_agent_suggestions(execution_id);
CREATE INDEX idx_ai_agent_suggestions_status ON public.ai_agent_suggestions(status);

CREATE TABLE IF NOT EXISTS public.ai_model_rates (
    id bigint NOT NULL,
    driver character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    input_cost_per_million numeric(12,6) NOT NULL,
    output_cost_per_million numeric(12,6) NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


CREATE SEQUENCE IF NOT EXISTS public.ai_model_rates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_model_rates_id_seq OWNED BY public.ai_model_rates.id;

ALTER TABLE ONLY public.ai_model_rates ALTER COLUMN id SET DEFAULT nextval('public.ai_model_rates_id_seq'::regclass);
ALTER TABLE ONLY public.ai_model_rates
    ADD CONSTRAINT ai_model_rates_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS ai_model_rates_driver_model_idx ON public.ai_model_rates USING btree (driver, model);

CREATE INDEX IF NOT EXISTS ai_model_rates_validity_idx ON public.ai_model_rates USING btree (valid_from, valid_to);


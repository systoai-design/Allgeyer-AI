-- Add unique constraint for company_id + integration_type to enable upsert
ALTER TABLE public.integrations 
ADD CONSTRAINT integrations_company_integration_unique 
UNIQUE (company_id, integration_type);
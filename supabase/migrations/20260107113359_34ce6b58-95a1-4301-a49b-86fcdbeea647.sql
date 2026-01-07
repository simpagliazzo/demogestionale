-- Create storage bucket for trip files (vouchers, tickets, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-files', 'trip-files', false);

-- Create storage bucket for participant documents (ID documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('participant-docs', 'participant-docs', false);

-- RLS policies for trip-files bucket
-- Staff can upload files to trips
CREATE POLICY "Staff can upload trip files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'trip-files' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Staff can view trip files
CREATE POLICY "Staff can view trip files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'trip-files' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'accompagnatore'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Staff can delete trip files
CREATE POLICY "Staff can delete trip files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'trip-files' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- RLS policies for participant-docs bucket
-- Staff can upload participant documents
CREATE POLICY "Staff can upload participant docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'participant-docs' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Staff can view participant documents
CREATE POLICY "Staff can view participant docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'participant-docs' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'accompagnatore'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Staff can delete participant documents
CREATE POLICY "Staff can delete participant docs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'participant-docs' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'agente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
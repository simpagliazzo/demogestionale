-- Create storage bucket for agency assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-assets', 'agency-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access for agency assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agency-assets');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload agency assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update agency assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete agency assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'agency-assets' AND auth.role() = 'authenticated');
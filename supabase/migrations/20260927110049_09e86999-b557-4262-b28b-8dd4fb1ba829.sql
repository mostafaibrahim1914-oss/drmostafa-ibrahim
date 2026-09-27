
CREATE POLICY "avatars own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('media','videos'));
CREATE POLICY "media admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('media','videos') AND public.is_admin());
CREATE POLICY "media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('media','videos') AND public.is_admin());
CREATE POLICY "media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('media','videos','avatars') AND public.is_admin());

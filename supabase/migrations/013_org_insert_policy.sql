-- Allow admins to create new organizations
-- Previously missing INSERT policy caused silent RLS failures
-- when creating client organizations from the /clients page

CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

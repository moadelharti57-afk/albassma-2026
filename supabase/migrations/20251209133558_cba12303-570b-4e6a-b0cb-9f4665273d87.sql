CREATE POLICY "Anyone can delete tickets"
ON public.participants
FOR DELETE
USING (true);
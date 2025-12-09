-- Create participants table for ticket registration
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  ticket_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_checked BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Allow public insert (no auth required for registration)
CREATE POLICY "Anyone can register" 
ON public.participants 
FOR INSERT 
WITH CHECK (true);

-- Allow public select for ticket verification
CREATE POLICY "Anyone can verify tickets" 
ON public.participants 
FOR SELECT 
USING (true);

-- Allow public update for check-in
CREATE POLICY "Anyone can check in tickets" 
ON public.participants 
FOR UPDATE 
USING (true);
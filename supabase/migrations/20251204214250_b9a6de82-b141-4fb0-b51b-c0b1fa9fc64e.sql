-- Add registered_by column to track which club member/agent registered the ticket
ALTER TABLE public.participants 
ADD COLUMN registered_by text;
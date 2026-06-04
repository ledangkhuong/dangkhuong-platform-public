-- Abandoned Cart Recovery: add tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at TIMESTAMPTZ;

-- Partial index for efficiently finding abandoned orders that haven't been emailed
CREATE INDEX IF NOT EXISTS idx_orders_abandoned
  ON public.orders(status, created_at)
  WHERE status = 'pending' AND recovery_email_sent = false;

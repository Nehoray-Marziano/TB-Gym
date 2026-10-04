-- Subscription prices are public reference data, but only administrators may
-- change them. Default table grants alone previously allowed anonymous writes.
BEGIN;

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read subscription tiers" ON public.subscription_tiers;
CREATE POLICY "Public can read subscription tiers"
ON public.subscription_tiers FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage subscription tiers" ON public.subscription_tiers;
CREATE POLICY "Admins can manage subscription tiers"
ON public.subscription_tiers FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

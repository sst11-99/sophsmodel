-- Widen without rounding existing values; retain the existing range check and RLS.
alter table public.model_applications
  alter column shoe_eu type numeric using shoe_eu::numeric;
alter table public.model_applications
  add constraint model_applications_shoe_half_step check (mod(shoe_eu * 2, 1) = 0);


CREATE TABLE public.technician_locations (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_locations TO authenticated;
GRANT ALL ON public.technician_locations TO service_role;

ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tech can upsert own location"
ON public.technician_locations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'technician'));

CREATE POLICY "Tech can update own location"
ON public.technician_locations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Techs and admins can view all locations"
ON public.technician_locations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technician')
  OR public.has_role(auth.uid(), 'admin')
);

-- Realtime
ALTER TABLE public.faults REPLICA IDENTITY FULL;
ALTER TABLE public.fault_events REPLICA IDENTITY FULL;
ALTER TABLE public.technician_locations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.faults;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fault_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;

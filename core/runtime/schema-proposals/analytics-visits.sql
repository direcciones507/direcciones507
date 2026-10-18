-- PR #103. Execute only after explicit production authorization.
-- Broadens the existing event check, preserving every previous value and row.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='15s';
DO $$
DECLARE c record; n integer:=0;
BEGIN
 FOR c IN SELECT co.conname,pg_get_expr(co.conbin,co.conrelid) AS expression
 FROM pg_constraint co JOIN pg_attribute a ON a.attrelid=co.conrelid AND a.attname='event_type'
 WHERE co.conrelid='ad507.ad507_business_analytics_events'::regclass AND co.contype='c' AND co.conkey=ARRAY[a.attnum]::smallint[]
 LOOP
  n:=n+1;
  IF position('visit' in c.expression)=0 THEN
   EXECUTE format('ALTER TABLE ad507.ad507_business_analytics_events DROP CONSTRAINT %I',c.conname);
   EXECUTE format('ALTER TABLE ad507.ad507_business_analytics_events ADD CONSTRAINT %I CHECK ((%s) OR event_type IN (''visit'',''whatsapp'',''call'',''qr''))',c.conname,c.expression);
  END IF;
 END LOOP;
 IF n<>1 THEN RAISE EXCEPTION 'Unexpected event constraint count: %',n; END IF;
END $$;
COMMIT;

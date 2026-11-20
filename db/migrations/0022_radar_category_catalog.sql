BEGIN;
-- Candidate only: register with the CORE migration manifest before execution.
CREATE TABLE radar.category_groups (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{0,63}$'),
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 100),
 icon text NOT NULL DEFAULT 'layers' CHECK (icon ~ '^[a-z][a-z0-9-]{0,63}$'),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE radar.category_catalog (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{0,63}$'),
 group_id text NOT NULL REFERENCES radar.category_groups(id) ON DELETE RESTRICT,
 label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 100),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
 active boolean NOT NULL DEFAULT true,
 capacity_unit text NOT NULL CHECK (capacity_unit IN ('tables','rooms','places','units'))
);
-- Existing establishment category strings are deliberately unchanged.

INSERT INTO radar.category_groups(id,label,icon,sort_order) VALUES
('gastronomy','Gastronomía','utensils',0),
('lodging','Hoteles y alojamiento','bed-double',10),
('nightlife','Tarde y noche','moon',20),
('tourism','Turismo y recreación','palmtree',30),
('commerce','Comercios','shopping-bag',40),
('wellness','Salud y bienestar','heart-pulse',50),
('services','Servicios','briefcase',60),
('other','Otros','layers',70);
INSERT INTO radar.category_catalog(id,group_id,label,sort_order,capacity_unit) VALUES
('restaurant','gastronomy','Restaurantes',0,'tables'),
('fonda','gastronomy','Fondas',10,'tables'),
('cafe','gastronomy','Cafeterías',20,'tables'),
('specialty-coffee','gastronomy','Cafés de especialidad',30,'tables'),
('pizza','gastronomy','Pizzerías',40,'tables'),
('fast-food','gastronomy','Comida rápida',50,'tables'),
('juice','gastronomy','Juguerías y refresquerías',60,'tables'),
('smoothies','gastronomy','Batidos y smoothies',70,'tables'),
('bubble-tea','gastronomy','Bubble tea',80,'tables'),
('bakery','gastronomy','Panaderías',90,'tables'),
('ice-cream','gastronomy','Heladerías',100,'tables'),
('pastry','gastronomy','Pastelerías',110,'tables'),
('hotel','lodging','Hoteles / alojamiento',0,'rooms'),
('hostel','lodging','Hostales',10,'rooms'),
('cabin','lodging','Cabañas',20,'rooms'),
('vacation-rental','lodging','Alquileres vacacionales / Airbnb',30,'rooms'),
('resort','lodging','Resorts',40,'rooms'),
('glamping','lodging','Glamping',50,'rooms'),
('bar','nightlife','Bares',0,'tables'),
('nightclub','nightlife','Discotecas',10,'places'),
('terrace','nightlife','Terrazas',20,'tables'),
('rooftop','nightlife','Rooftops',30,'tables'),
('karaoke','nightlife','Karaokes',40,'tables'),
('brewery','nightlife','Cervecerías',50,'tables'),
('lounge','nightlife','Lounges',60,'tables'),
('casino','nightlife','Casinos',70,'places'),
('event-hall','nightlife','Salones de eventos',80,'places'),
('tourism','tourism','Turismo',0,'places'),
('recreation','tourism','Parques recreativos',10,'places'),
('sports','tourism','Deportes',20,'places'),
('shop','commerce','Comercio',0,'units'),
('supermarket','commerce','Supermercados',10,'units'),
('mall','commerce','Centros comerciales',20,'units'),
('health','wellness','Salud',0,'places'),
('pharmacy','wellness','Farmacias',10,'units'),
('clinic','wellness','Clínicas',20,'places'),
('gym','wellness','Gimnasios',30,'places'),
('services','services','Servicios',0,'places'),
('workshop','services','Talleres',10,'units'),
('barber','services','Barberías',20,'places'),
('beauty','services','Salones de belleza',30,'places'),
('education','services','Educación',40,'places'),
('other','other','Otra',0,'units'),
('entertainment','other','Entretenimiento',10,'places');
COMMIT;

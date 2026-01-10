-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.AiReport (
  id integer NOT NULL DEFAULT nextval('"AiReport_id_seq"'::regclass),
  summary text NOT NULL,
  symptoms jsonb NOT NULL,
  criticality text NOT NULL DEFAULT 'LOW'::text CHECK (criticality = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])),
  generatedAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  userId uuid NOT NULL,
  CONSTRAINT AiReport_pkey PRIMARY KEY (id),
  CONSTRAINT AiReport_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Application (
  id integer NOT NULL DEFAULT nextval('"Application_id_seq"'::regclass),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  notes text,
  petId integer NOT NULL,
  userId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT Application_pkey PRIMARY KEY (id),
  CONSTRAINT Application_petId_fkey FOREIGN KEY (petId) REFERENCES public.Pet(id),
  CONSTRAINT Application_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Appointment (
  id integer NOT NULL DEFAULT nextval('"Appointment_id_seq"'::regclass),
  date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'COMPLETED'::text, 'CANCELLED'::text])),
  type text NOT NULL,
  userId uuid NOT NULL,
  aiReportId integer UNIQUE,
  is_emergency boolean,
  original_time timestamp without time zone,
  pet_id integer,
  vetId uuid,
  CONSTRAINT Appointment_pkey PRIMARY KEY (id),
  CONSTRAINT Appointment_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Appointment_aiReportId_fkey FOREIGN KEY (aiReportId) REFERENCES public.AiReport(id),
  CONSTRAINT Appointment_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.Pet(id),
  CONSTRAINT Appointment_vetId_fkey FOREIGN KEY (vetId) REFERENCES public.User(id)
);
CREATE TABLE public.Donation (
  id integer NOT NULL DEFAULT nextval('"Donation_id_seq"'::regclass),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  status text NOT NULL DEFAULT 'PENDING'::text,
  paymentId text,
  message text,
  anonymous boolean DEFAULT false,
  userId uuid,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT Donation_pkey PRIMARY KEY (id),
  CONSTRAINT Donation_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.MedicalRecord (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id integer NOT NULL,
  vet_id uuid NOT NULL,
  visit_type text NOT NULL,
  summary text NOT NULL,
  diagnosis text,
  treatment text,
  weight numeric,
  temperature numeric,
  heart_rate integer,
  created_at timestamp without time zone,
  CONSTRAINT MedicalRecord_pkey PRIMARY KEY (id),
  CONSTRAINT MedicalRecord_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.Pet(id),
  CONSTRAINT MedicalRecord_vet_id_fkey FOREIGN KEY (vet_id) REFERENCES public.User(id)
);
CREATE TABLE public.Message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticketId integer,
  senderId uuid,
  content text NOT NULL,
  type text NOT NULL,
  isRead boolean,
  createdAt timestamp without time zone,
  CONSTRAINT Message_pkey PRIMARY KEY (id),
  CONSTRAINT Message_ticketId_fkey FOREIGN KEY (ticketId) REFERENCES public.Ticket(id),
  CONSTRAINT Message_senderId_fkey FOREIGN KEY (senderId) REFERENCES public.User(id)
);
CREATE TABLE public.Order (
  id integer NOT NULL DEFAULT nextval('"Order_id_seq"'::regclass),
  totalAmount numeric NOT NULL,
  status text NOT NULL,
  type text NOT NULL DEFAULT 'SHOP_ORDER'::text,
  userId uuid NOT NULL,
  items jsonb NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT Order_pkey PRIMARY KEY (id),
  CONSTRAINT Order_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Pet (
  id integer NOT NULL DEFAULT nextval('"Pet_id_seq"'::regclass),
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  age integer,
  location text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL,
  status text NOT NULL DEFAULT '''Stray'',''Adopted''::text'::text CHECK (status = ANY (ARRAY['Stray'::text, 'Adopted'::text])),
  ownerId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  adoptedAt timestamp with time zone,
  CONSTRAINT Pet_pkey PRIMARY KEY (id),
  CONSTRAINT Pet_ownerId_fkey FOREIGN KEY (ownerId) REFERENCES public.User(id)
);
CREATE TABLE public.Product (
  id integer NOT NULL DEFAULT nextval('"Product_id_seq"'::regclass),
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  imageUrl text NOT NULL,
  category text NOT NULL,
  CONSTRAINT Product_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Ticket (
  id integer NOT NULL DEFAULT nextval('"Ticket_id_seq"'::regclass),
  subject text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'CLOSED'::text])),
  userId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  imageUrl text,
  location_name text,
  latitude numeric,
  longitude numeric,
  convertedPetId integer,
  CONSTRAINT Ticket_pkey PRIMARY KEY (id),
  CONSTRAINT Ticket_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Ticket_convertedPetId_fkey FOREIGN KEY (convertedPetId) REFERENCES public.Pet(id)
);
CREATE TABLE public.User (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT '''USER'':''Super_Admin'',''Admin'',''Vet'',''User'''::text CHECK (role = ANY (ARRAY['Super_Admin'::text, 'Admin'::text, 'Vet'::text, 'User'::text])),
  phone text,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  password text,
  CONSTRAINT User_pkey PRIMARY KEY (id),
  CONSTRAINT User_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  userId uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  status text,
  image text,
  color text,
  date timestamp with time zone DEFAULT now(),
  createdAt timestamp with time zone DEFAULT now(),
  details jsonb,
  CONSTRAINT Activity_pkey PRIMARY KEY (id),
  CONSTRAINT Activity_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Appointment (
  id integer NOT NULL DEFAULT nextval('"Appointment_id_seq"'::regclass),
  date timestamp with time zone NOT NULL,
  type text NOT NULL,
  userId uuid NOT NULL,
  aiReportId integer UNIQUE,
  is_emergency boolean,
  updatedDate timestamp with time zone,
  pet_id integer,
  vetId uuid,
  bookingReason text,
  CONSTRAINT Appointment_pkey PRIMARY KEY (id),
  CONSTRAINT Appointment_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Appointment_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.Pet(id),
  CONSTRAINT Appointment_vetId_fkey FOREIGN KEY (vetId) REFERENCES public.User(id)
);
CREATE TABLE public.Donation (
  id integer NOT NULL DEFAULT nextval('"Donation_id_seq"'::regclass),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  message text,
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
  createdAt timestamp with time zone,
  receiverId uuid,
  is_forAdoption boolean,
  CONSTRAINT Message_pkey PRIMARY KEY (id),
  CONSTRAINT Message_senderId_fkey FOREIGN KEY (senderId) REFERENCES public.User(id),
  CONSTRAINT Message_receiverId_fkey FOREIGN KEY (receiverId) REFERENCES auth.users(id)
);
CREATE TABLE public.Notification (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  userId uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['pet_status'::text, 'new_chat'::text, 'appointment_update'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  isRead boolean DEFAULT false,
  createdAt timestamp with time zone DEFAULT now(),
  CONSTRAINT Notification_pkey PRIMARY KEY (id),
  CONSTRAINT Notification_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.Order (
  id integer NOT NULL DEFAULT nextval('"Order_id_seq"'::regclass),
  totalAmount numeric NOT NULL,
  status text NOT NULL,
  type text NOT NULL DEFAULT 'SHOP_ORDER'::text,
  userId uuid NOT NULL,
  items jsonb NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  product_id integer,
  phoneNumber bigint,
  address text,
  CONSTRAINT Order_pkey PRIMARY KEY (id),
  CONSTRAINT Order_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id),
  CONSTRAINT Order_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.Product(id)
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
  status text NOT NULL DEFAULT '''''Stray'''',''''Adopted'''',"Pending","Rejected"::text''''::text''::text'::text CHECK (status = ANY (ARRAY['Stray'::text, 'Pending'::text, 'Adopted'::text, 'Rejected'::text])),
  ownerId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  adoptedAt timestamp with time zone,
  Longitude numeric,
  Latitude numeric,
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
  income double precision,
  CONSTRAINT Product_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Report (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  userId uuid,
  subject text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'Pending'::text,
  createdAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updatedAt timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT Report_pkey PRIMARY KEY (id),
  CONSTRAINT Report_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
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
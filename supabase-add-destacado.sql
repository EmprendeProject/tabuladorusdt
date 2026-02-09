-- =============================================
-- ADD DESTACADO COLUMN TO PRODUCTOS TABLE
-- =============================================
-- This migration adds the 'destacado' (featured) column to the productos table
-- to enable featured products functionality in the catalog.

-- Add destacado column to productos table
ALTER TABLE public.productos 
  ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance when sorting by destacado
CREATE INDEX IF NOT EXISTS idx_productos_destacado ON public.productos(destacado);

-- Optional: Update a few existing products to be featured for testing
-- UNCOMMENT the lines below and modify the IDs after running the migration
-- to mark some products as featured for testing purposes.

-- UPDATE public.productos SET destacado = true WHERE id IN (1, 2, 3);

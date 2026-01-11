-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA SUPABASE
-- ============================================
-- 
-- Para usar este esquema:
-- 1. Ve a tu proyecto en Supabase
-- 2. Abre el SQL Editor
-- 3. Pega este código y ejecútalo
-- ============================================

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_usdt DECIMAL(10, 2) NOT NULL DEFAULT 0,
  profit DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Crear tabla de tasas (opcional - para guardar historial)
CREATE TABLE IF NOT EXISTS tasas (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('BCV', 'USDT')),
  valor DECIMAL(10, 2) NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_created_at ON productos(created_at);
CREATE INDEX IF NOT EXISTS idx_tasas_tipo_fecha ON tasas(tipo, fecha);

-- Habilitar Row Level Security (RLS)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasas ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura pública (ajusta según tus necesidades)
CREATE POLICY "Permitir lectura pública de productos"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserción pública de productos"
  ON productos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de productos"
  ON productos FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminación pública de productos"
  ON productos FOR DELETE
  USING (true);

-- Políticas para tasas
CREATE POLICY "Permitir lectura pública de tasas"
  ON tasas FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserción pública de tasas"
  ON tasas FOR INSERT
  WITH CHECK (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en productos
CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos de ejemplo (opcional)
INSERT INTO productos (nombre, precio_usdt, profit) VALUES
  ('papa chip', 54, 22),
  ('papa congelada', 21, 22),
  ('facilita kraft', 8, 22)
ON CONFLICT DO NOTHING;

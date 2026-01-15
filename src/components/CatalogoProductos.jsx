import { useEffect, useMemo, useState } from 'react';
import { CATALOG_TEMPLATES } from '../data/catalogSettingsRepository';
import { useCatalogTemplate } from '../hooks/useCatalogTemplate';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';

import CatalogTemplateSimple from './catalog/CatalogTemplateSimple';
import CatalogTemplateBoutique from './catalog/CatalogTemplateBoutique';
import CatalogTemplateModern from './catalog/CatalogTemplateModern';
import ProductoDetalleModal from './ProductoDetalleModal';

const CatalogoProductos = ({ ownerId, brandName } = {}) => {
  const [query, setQuery] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const { productos, cargando, error, recargar } = useProductos({ scope: 'public', ownerId });
  const { catalogTemplate } = useCatalogTemplate({ ownerId });
  const { tasaBCV, tasaUSDT } = useTasas();

  useEffect(() => {
    // Si el usuario cambia de plantilla, no mantenemos un filtro oculto.
    if (catalogTemplate !== CATALOG_TEMPLATES.MODERN) {
      setCategoriaActiva('');
    }
  }, [catalogTemplate]);

  const tasaBCVNum = useMemo(() => parseFloat(tasaBCV) || 0, [tasaBCV]);
  const tasaUSDTNum = useMemo(() => parseFloat(tasaUSDT) || 0, [tasaUSDT]);

  const productosConPrecioSugerido = useMemo(() => {
    const list = Array.isArray(productos) ? productos : [];
    return list.map((p) => {
      const costo = Number(p?.precioUSDT) || 0;
      const profit = Number(p?.profit) || 0;

      // Precio sugerido ($) basado en: (costo * USDT / BCV) * (1 + profit%)
      // Fallback: si no hay tasas, usar costo * (1 + profit%).
      const base = tasaBCVNum > 0 && tasaUSDTNum > 0 ? (costo * tasaUSDTNum) / tasaBCVNum : costo;
      const precioSugeridoUsd = base * (1 + profit / 100);

      return { ...p, precioSugeridoUsd };
    });
  }, [productos, tasaBCVNum, tasaUSDTNum]);

  const productosFiltradosConPrecioSugerido = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cat = String(categoriaActiva || '').trim().toLowerCase();
    const isModern = catalogTemplate === CATALOG_TEMPLATES.MODERN;

    return productosConPrecioSugerido.filter((p) => {
      const nombre = String(p?.nombre || '').toLowerCase();
      if (q && !nombre.includes(q)) return false;

      if (isModern && cat) {
        const pc = String(p?.categoria || '').trim().toLowerCase();
        if (pc !== cat) return false;
      }

      return true;
    });
  }, [productosConPrecioSugerido, query, categoriaActiva, catalogTemplate]);

  const categorias = useMemo(() => {
    // Categorías “del usuario” derivadas de sus productos (visible en catálogo público).
    const list = Array.isArray(productosConPrecioSugerido) ? productosConPrecioSugerido : [];
    const map = new Map();
    for (const p of list) {
      const raw = String(p?.categoria || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, raw);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [productosConPrecioSugerido]);

  const templateProps = {
    productos: productosConPrecioSugerido,
    productosFiltrados: productosFiltradosConPrecioSugerido,
    query,
    setQuery,
    categorias,
    categoriaActiva,
    setCategoriaActiva,
    cargando,
    error,
    onReload: recargar,
    brandName,
    onSelectProducto: (p) => setProductoSeleccionado({ ...p, _tasaBCV: tasaBCVNum }),
  };

  const Template =
    catalogTemplate === CATALOG_TEMPLATES.BOUTIQUE
      ? CatalogTemplateBoutique
      : catalogTemplate === CATALOG_TEMPLATES.MODERN
        ? CatalogTemplateModern
        : CatalogTemplateSimple;

  return (
    <>
      <Template {...templateProps} />
      <ProductoDetalleModal
        open={!!productoSeleccionado}
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
      />
    </>
  );
};

export default CatalogoProductos;

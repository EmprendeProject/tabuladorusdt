import { useMemo, useState } from 'react';
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
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const { productos, cargando, error, recargar } = useProductos({ scope: 'public', ownerId });
  const { catalogTemplate } = useCatalogTemplate({ ownerId });
  const { tasaBCV, tasaUSDT } = useTasas();

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
    if (!q) return productosConPrecioSugerido;
    return productosConPrecioSugerido.filter((p) => (p.nombre || '').toLowerCase().includes(q));
  }, [productosConPrecioSugerido, query]);

  const templateProps = {
    productos: productosConPrecioSugerido,
    productosFiltrados: productosFiltradosConPrecioSugerido,
    query,
    setQuery,
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

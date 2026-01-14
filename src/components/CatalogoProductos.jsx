import { useMemo, useState } from 'react';
import { CATALOG_TEMPLATES } from '../data/catalogSettingsRepository';
import { useCatalogTemplate } from '../hooks/useCatalogTemplate';
import { useProductos } from '../hooks/useProductos';

import CatalogTemplateSimple from './catalog/CatalogTemplateSimple';
import CatalogTemplateBoutique from './catalog/CatalogTemplateBoutique';
import CatalogTemplateModern from './catalog/CatalogTemplateModern';

const CatalogoProductos = () => {
  const [query, setQuery] = useState('');
  const { productos, cargando, error, recargar } = useProductos({ scope: 'public' });
  const { catalogTemplate } = useCatalogTemplate();

  const productosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => (p.nombre || '').toLowerCase().includes(q));
  }, [productos, query]);

  const templateProps = {
    productos,
    productosFiltrados,
    query,
    setQuery,
    cargando,
    error,
    onReload: recargar,
  };

  if (catalogTemplate === CATALOG_TEMPLATES.BOUTIQUE) {
    return <CatalogTemplateBoutique {...templateProps} />;
  }

  if (catalogTemplate === CATALOG_TEMPLATES.MODERN) {
    return <CatalogTemplateModern {...templateProps} />;
  }

  return <CatalogTemplateSimple {...templateProps} />;
};

export default CatalogoProductos;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { productoFromDb } from '../lib/productos';
import {
  CATALOG_TEMPLATES,
  DEFAULT_CATALOG_TEMPLATE,
  fetchCatalogTemplate,
  subscribeCatalogTemplate,
} from '../lib/catalogSettings';

import CatalogTemplateSimple from './catalog/CatalogTemplateSimple';
import CatalogTemplateBoutique from './catalog/CatalogTemplateBoutique';
import CatalogTemplateModern from './catalog/CatalogTemplateModern';

const CatalogoProductos = () => {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [catalogTemplate, setCatalogTemplate] = useState(DEFAULT_CATALOG_TEMPLATE);

  const cargarProductos = useCallback(async () => {
    setError('');
    setCargando(true);

    try {
      const { data, error: selectError } = await supabase
        .from('productos')
        .select('id,nombre,precio_usdt,imagen_url')
        .order('created_at', { ascending: false });

      if (selectError) throw selectError;

      setProductos((data || []).map(productoFromDb).filter(Boolean));
    } catch (e) {
      console.error('Error al cargar productos:', e);
      setError(e?.message || 'No se pudieron cargar los productos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();

    let unsubscribeSettings;
    fetchCatalogTemplate()
      .then((t) => setCatalogTemplate(t))
      .catch((e) => {
        console.warn('No se pudo cargar la plantilla del catálogo:', e);
        setCatalogTemplate(DEFAULT_CATALOG_TEMPLATE);
      });

    unsubscribeSettings = subscribeCatalogTemplate((next) => {
      if (next === CATALOG_TEMPLATES.BOUTIQUE) setCatalogTemplate(CATALOG_TEMPLATES.BOUTIQUE);
      else if (next === CATALOG_TEMPLATES.MODERN) setCatalogTemplate(CATALOG_TEMPLATES.MODERN);
      else setCatalogTemplate(DEFAULT_CATALOG_TEMPLATE);
    });

    const subscription = supabase
      .channel('catalogo-productos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nuevo = productoFromDb(payload.new);
            if (!nuevo) return;
            setProductos((prev) => [nuevo, ...prev.filter((p) => p.id !== nuevo.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const actualizado = productoFromDb(payload.new);
            if (!actualizado) return;
            setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
          } else if (payload.eventType === 'DELETE') {
            const id = payload?.old?.id;
            if (!id) return;
            setProductos((prev) => prev.filter((p) => p.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      unsubscribeSettings?.();
    };
  }, [cargarProductos]);

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
    onReload: cargarProductos,
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

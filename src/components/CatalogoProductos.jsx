import { useEffect, useMemo, useState } from 'react';
import { CATALOG_TEMPLATES } from '../data/catalogSettingsRepository';
import { useCatalogTemplate } from '../hooks/useCatalogTemplate';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';
import { perfilesRepository } from '../data/perfilesRepository';

import CatalogTemplateSimple from './catalog/CatalogTemplateSimple';
import CatalogTemplateBoutique from './catalog/CatalogTemplateBoutique';
import CatalogTemplateModern from './catalog/CatalogTemplateModern';
import CatalogTemplateHeavy from './catalog/CatalogTemplateHeavy';
import CatalogTemplateUrbanStreet from './catalog/CatalogTemplateUrbanStreet';
import ProductoDetalleModal from './ProductoDetalleModal';
import CartDrawer from './CartDrawer';
import CartFab from './CartFab';
import { CartProvider, useCart } from '../context/CartContext';

// Inner component that consumes CartContext
const CatalogoProductosInner = ({ ownerId, brandName }) => {
  const [query, setQuery] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const { productos, cargando, error, recargar } = useProductos({ scope: 'public', ownerId });
  const { catalogTemplate, logoUrl, accentColor } = useCatalogTemplate({ ownerId });
  const { tasaBCV, tasaUSDT } = useTasas();
  const { addItem } = useCart();

  // Fetch the store owner's WhatsApp number for the cart
  useEffect(() => {
    if (!ownerId) return;
    perfilesRepository.getPublicContactByUserId(ownerId)
      .then((contact) => {
        const digits = String(contact?.telefono || '').replace(/\D/g, '');
        setWhatsappNumber(digits);
      })
      .catch(() => {});
  }, [ownerId]);

  useEffect(() => {
    if (
      catalogTemplate !== CATALOG_TEMPLATES.MODERN &&
      catalogTemplate !== CATALOG_TEMPLATES.HEAVY &&
      catalogTemplate !== CATALOG_TEMPLATES.SIMPLE
    ) {
      Promise.resolve().then(() => {
        setCategoriaActiva('');
      });
    }
  }, [catalogTemplate]);

  const tasaBCVNum = useMemo(() => parseFloat(tasaBCV) || 0, [tasaBCV]);
  const tasaUSDTNum = useMemo(() => parseFloat(tasaUSDT) || 0, [tasaUSDT]);

  const productosConPrecioSugerido = useMemo(() => {
    const list = Array.isArray(productos) ? productos : [];
    return list.map((p) => {
      const costo = Number(p?.precioUSDT) || 0;
      const profit = Number(p?.profit) || 0;
      let precioSugeridoUsd = 0;
      if (p.isFixedPrice) {
        precioSugeridoUsd = costo;
      } else {
        const base = tasaBCVNum > 0 && tasaUSDTNum > 0 ? (costo * tasaUSDTNum) / tasaBCVNum : costo;
        precioSugeridoUsd = base * (1 + profit / 100);
      }
      return { ...p, precioSugeridoUsd };
    });
  }, [productos, tasaBCVNum, tasaUSDTNum]);

  const productosFiltradosConPrecioSugerido = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cat = String(categoriaActiva || '').trim().toLowerCase();
    const supportsCategoryFilter =
      catalogTemplate === CATALOG_TEMPLATES.MODERN ||
      catalogTemplate === CATALOG_TEMPLATES.HEAVY ||
      catalogTemplate === CATALOG_TEMPLATES.SIMPLE ||
      catalogTemplate === CATALOG_TEMPLATES.URBAN_STREET;

    return productosConPrecioSugerido.filter((p) => {
      const nombre = String(p?.nombre || '').toLowerCase();
      if (q && !nombre.includes(q)) return false;
      if (supportsCategoryFilter && cat) {
        const pc = String(p?.categoria || '').trim().toLowerCase();
        if (pc !== cat) return false;
      }
      return true;
    });
  }, [productosConPrecioSugerido, query, categoriaActiva, catalogTemplate]);

  const categorias = useMemo(() => {
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

  const handleAddToCart = (producto, cantidad) => {
    addItem(producto, cantidad);
    setCartOpen(true);
  };

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
    logoUrl,
    accentColor,
    onSelectProducto: (p) => setProductoSeleccionado({ ...p, _tasaBCV: tasaBCVNum }),
  };

  const Template =
    catalogTemplate === CATALOG_TEMPLATES.BOUTIQUE
      ? CatalogTemplateBoutique
      : catalogTemplate === CATALOG_TEMPLATES.MODERN
        ? CatalogTemplateModern
        : catalogTemplate === CATALOG_TEMPLATES.HEAVY
          ? CatalogTemplateHeavy
          : catalogTemplate === CATALOG_TEMPLATES.URBAN_STREET
            ? CatalogTemplateUrbanStreet
            : CatalogTemplateSimple;

  return (
    <>
      <Template {...templateProps} />

      <ProductoDetalleModal
        open={!!productoSeleccionado}
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        onAddToCart={handleAddToCart}
        accentColor={accentColor}
      />

      {/* Floating cart button — only visible when cart has items */}
      <CartFab
        onClick={() => setCartOpen(true)}
        accentColor={accentColor}
      />

      {/* Cart drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        whatsappNumber={whatsappNumber}
        tasaBCV={tasaBCVNum}
        accentColor={accentColor}
        shopName={brandName}
      />
    </>
  );
};

const CatalogoProductos = ({ ownerId, brandName } = {}) => (
  <CartProvider>
    <CatalogoProductosInner ownerId={ownerId} brandName={brandName} />
  </CartProvider>
);

export default CatalogoProductos;


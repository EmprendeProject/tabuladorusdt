import { useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Package, RefreshCw, Plus, X, LayoutGrid, List, Tags, Search } from 'lucide-react';
import { deleteStorageObject, getProductImagesBucketName, getStorageObjectFromPublicUrl, uploadProductImage } from '../lib/storage';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';
import { useCategorias } from '../hooks/useCategorias';
import { useCatalogTemplate } from '../hooks/useCatalogTemplate';
import { eliminarProducto, guardarCambiosProductos, setProductoActivo } from '../usecases/productosUsecases';
import ProductoFormModal from './ProductoFormModal';
import NuevaCategoriaModal from './NuevaCategoriaModal';
import GestionCategoriasModal from './GestionCategoriasModal';
import ToastStack from './ToastStack';
import { TOAST_TYPE, useToasts } from '../hooks/useToasts';

const formatearUsd = (n) => (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatearBs = (n) => (parseFloat(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Interruptor "visible en el catálogo".
const VisibleSwitch = ({ isVisible, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${isVisible ? 'bg-neutral-900' : 'bg-neutral-300'}`}
    aria-pressed={isVisible}
    aria-label={isVisible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}
    title={isVisible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}
  >
    <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${isVisible ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
  </button>
);

const DashboardPrecios = ({ ownerId, tiendaId } = {}) => {
  // Preferencia persistida en Supabase: mostrar/ocultar precios en Bs
  const {
    mostrarPrecioBs: mostrarBs,
    setMostrarPrecioBs: setMostrarBs,
  } = useCatalogTemplate({ enableSave: true, ownerId, tiendaId });
  const {
    tasaBCV,
    tasaUSDT,
    cargandoBCV,
    cargandoUSDT,
    refrescarBCV,
    refrescarUSDT,
  } = useTasas();
  
  // Estado de productos
  const {
    productos,
    setProductos,
    cargando: cargandoProductos,
    error: productosError,
  } = useProductos({ ownerId, tiendaId });
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(new Set()); // Set de IDs con cambios
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState({}); // id -> boolean
  const [productoFormOpen, setProductoFormOpen] = useState(false);
  const [productoParaEditar, setProductoParaEditar] = useState(null);
  const [nuevaCategoriaOpen, setNuevaCategoriaOpen] = useState(false);
  const [gestionarCategoriasOpen, setGestionarCategoriasOpen] = useState(false);
  const [categoriaTargetProductoId, setCategoriaTargetProductoId] = useState(null);
  const [productosView, setProductosView] = useState('list'); // list | grid
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  
  const { toasts, pushToast, dismissToast } = useToasts();

  const {
    categorias,
    nombres: categoriasNombres,
    createCategoria,
    removeCategoria,
    guardando: guardandoCategoria,
    eliminandoId: eliminandoCategoriaId,
    error: categoriasError,
  } = useCategorias({ tiendaId });

  // Funciones auxiliares para obtener valores numéricos
  const getTasaBCV = () => parseFloat(tasaBCV) || 0;
  const getTasaUSDT = () => parseFloat(tasaUSDT) || 0;

  // Función para calcular Precio Real BCV (en dólares)
  // Fórmula: (PRECIO USDT × TASA USDT) / TASA BCV
  const calcularPrecioRealBCV = (precioUSDT) => {
    const tasaBCVNum = getTasaBCV();
    const tasaUSDTNum = getTasaUSDT();
    if (tasaBCVNum === 0) return 0;
    return (precioUSDT * tasaUSDTNum) / tasaBCVNum;
  };

  // Función para calcular Precio de Venta (en dólares BCV, con profit aplicado)
  // PRECIO DE VENTA = PRECIO REAL BCV × (1 + PROFIT%)
  const calcularPrecioVenta = (prod) => {
    if (prod.isFixedPrice) return Number(prod.precioUSDT) || 0;
    const precioRealBCVDolares = calcularPrecioRealBCV(Number(prod.precioUSDT) || 0);
    return precioRealBCVDolares * (1 + (Number(prod.profit) || 0) / 100);
  };

  const handleUpdateProductoInList = (id, campo, valor) => {
    // Actualización local solo para cambios de estado like "activo" directos en lista si los hay
    let nuevoValor = valor;
    // ... logic mostly redundant if we don't inline edit, but kept for handleToggleVisible usage
    setProductos(prev => prev.map(p => 
      p.id === id ? { ...p, [campo]: nuevoValor } : p
    ));
  };

  const handleAgregarProducto = () => {
    setProductoParaEditar(null);
    setProductoFormOpen(true);
  };

  const handleEditarProducto = (prod) => {
    setProductoParaEditar(prod);
    setProductoFormOpen(true);
  };

  const handleProductFormSubmit = async (productData) => {
    // Check if new or edit
    const isNew = productData.id < 0;
    
    if (isNew) {
         const productoConDefaults = {
           activo: true,
           ...(ownerId ? { ownerId } : {}),
           ...(tiendaId ? { tiendaId } : {}),
           ...productData,
         };
         setProductos((prev) => [productoConDefaults, ...prev]);

         try {
           const nuevosIdsMap = await guardarCambiosProductos({
             productos: [productoConDefaults],
             idsParaGuardar: [productoConDefaults.id],
           });
           const realId = nuevosIdsMap[productoConDefaults.id];
           if (realId != null) {
              setProductos((prev) => prev.map((p) => (p.id === productoConDefaults.id ? { ...p, id: realId } : p)));
           }
         } catch (e) {
            setProductos((prev) => prev.filter((p) => p.id !== productoConDefaults.id));
            throw e;
         }
    } else {
        // Edit logic
        const prevProducto = productos.find(p => p.id === productData.id);
        const productoConDefaults = {
           ...prevProducto,
           ...productData,
        };
        
        setProductos((prev) => prev.map(p => p.id === productData.id ? productoConDefaults : p));
        
        try {
            await guardarCambiosProductos({
                productos: [productoConDefaults],
                idsParaGuardar: [productData.id]
            });
            
            // Image cleanup logic
            if (ownerId && prevProducto) {
                 const bucket = getProductImagesBucketName();
                 const allowedPrefix = `productos/${String(ownerId)}/`;
                 const oldImages = Array.isArray(prevProducto.imagenes) 
                    ? prevProducto.imagenes 
                    : (prevProducto.imagenUrl ? [prevProducto.imagenUrl] : []);
                 
                 const newImages = new Set(productData.imagenes || []);
                 
                 for (const url of oldImages) {
                    if (!url || newImages.has(url)) continue;
                    
                    const meta = getStorageObjectFromPublicUrl(url);
                    if (!meta || meta.bucket !== bucket) continue;
                    if (!String(meta.path || '').startsWith(allowedPrefix)) continue;
                    
                    // Fire and forget delete
                    deleteStorageObject(meta).catch(err => console.warn('Failed to delete old image', err));
                 }
            }
            
        } catch (e) {
            // Revert
            if (prevProducto) {
                setProductos((prev) => prev.map(p => p.id === productData.id ? prevProducto : p));
            }
            throw e;
        }
    }
  };




  const abrirNuevaCategoria = (productoId = null) => {
    setCategoriaTargetProductoId(productoId);
    setNuevaCategoriaOpen(true);
  };

  const onCreateCategoria = async (nombre) => {
    const created = await createCategoria(nombre);
    const nombreCreado = created?.nombre || String(nombre || '').trim();

    // Si estamos creando desde un producto, asignarla automáticamente.
    if (categoriaTargetProductoId != null) {
      handleUpdateProductoInList(categoriaTargetProductoId, 'categoria', nombreCreado);
    }
    return created;
  };

  const handleToggleVisible = async (prod) => {
    const nextActivo = !(prod.activo !== false);

    // Si aún no está persistido, tratamos esto como un cambio normal.
    if (prod.id < 0) {
      handleUpdateProductoInList(prod.id, 'activo', nextActivo);
      return;
    }

    // Optimista (sin marcar como "pendiente" porque lo persistimos ahora)
    setProductos((prev) => prev.map((p) => (p.id === prod.id ? { ...p, activo: nextActivo } : p)));

    try {
      await setProductoActivo({ id: prod.id, activo: nextActivo });
      pushToast({
        type: TOAST_TYPE.SUCCESS,
        title: 'Visibilidad actualizada',
        message: nextActivo ? 'El producto ahora está visible en el catálogo.' : 'El producto fue ocultado del catálogo.',
      });
    } catch (e) {
      // Revertir si falla
      setProductos((prev) => prev.map((p) => (p.id === prod.id ? { ...p, activo: prod.activo } : p)));

      const msg = e?.message || '';
      const msgLower = String(msg).toLowerCase();
      if (
        msgLower.includes('activo') &&
        (msgLower.includes('does not exist') || msgLower.includes('no existe'))
      ) {
        pushToast({
          type: TOAST_TYPE.WARNING,
          title: 'Falta migración',
          message: 'Tu base de datos aún no tiene la columna "activo". Ejecuta el SQL actualizado en supabase-schema.sql.',
          durationMs: 6000,
        });
      } else if (
        msgLower.includes('row level security') ||
        msgLower.includes('violates row-level security') ||
        msgLower.includes('permission denied')
      ) {
        pushToast({
          type: TOAST_TYPE.ERROR,
          title: 'Bloqueado por RLS',
          message: 'Supabase bloqueó el cambio. Verifica el UUID admin y que ejecutaste las policies de update en supabase-schema.sql.',
          durationMs: 7000,
        });
      } else {
        pushToast({
          type: TOAST_TYPE.ERROR,
          title: 'Error',
          message: 'No se pudo actualizar la visibilidad del producto.',
        });
      }
    }
  };



  const handleEliminarProducto = async (id) => {
    // Optimista: eliminar de la UI inmediatamente
    const productoEliminado = productos.find(p => p.id === id);
    setProductos(prev => prev.filter(p => p.id !== id));
    
    // Si estaba en cambios sin guardar, quitarlo del set
    if (cambiosSinGuardar.has(id)) {
      setCambiosSinGuardar(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
    
    // Si tiene ID positivo, borrar de BD
    if (id > 0) {
      try {
        await eliminarProducto(id);

        // Limpieza: intentar borrar la imagen del producto eliminado (solo dentro de la carpeta del usuario).
        if (ownerId) {
          const bucket = getProductImagesBucketName();
          const allowedPrefix = `productos/${String(ownerId)}/`;
          const imgs = Array.isArray(productoEliminado?.imagenes)
            ? productoEliminado.imagenes
            : (productoEliminado?.imagenUrl ? [productoEliminado.imagenUrl] : []);

          for (const url of imgs) {
            const meta = getStorageObjectFromPublicUrl(url);
            if (!meta) continue;
            if (meta.bucket !== bucket) continue;
            if (!String(meta.path || '').startsWith(allowedPrefix)) continue;
            try {
              await deleteStorageObject(meta);
            } catch (e) {
              console.warn('No se pudo borrar una imagen del producto eliminado:', e);
            }
          }
        }

        pushToast({ type: TOAST_TYPE.SUCCESS, title: 'Eliminado', message: 'Producto eliminado.' });
      } catch (e) {
        console.error('Error al eliminar:', e);
        // Si falla, revertir (volver a agregar)
        if (productoEliminado) setProductos(prev => [...prev, productoEliminado]);
        pushToast({ type: TOAST_TYPE.ERROR, title: 'Error', message: 'No se pudo eliminar el producto.' });
      }
    }
  };

  const confirmarEliminarProducto = async (id) => {
    const prod = productos.find((p) => p.id === id)
    const nombre = prod?.nombre ? `“${prod.nombre}”` : 'este producto'
    const ok = window.confirm(`¿Seguro que quieres eliminar ${nombre}? Esta acción no se puede deshacer.`)
    if (!ok) return
    await handleEliminarProducto(id)
  }



  const productosRecientes = useMemo(() => {
    return Array.isArray(productos) ? productos : [];
  }, [productos]);

  const categoriasParaFiltro = useMemo(() => {
    const fromCatalog = Array.isArray(categoriasNombres) ? categoriasNombres : [];
    const fromProductos = (Array.isArray(productosRecientes) ? productosRecientes : [])
      .map((p) => String(p?.categoria || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...fromCatalog, ...fromProductos])).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }, [categoriasNombres, productosRecientes]);

  const productosFiltradosDashboard = useMemo(() => {
    const list = Array.isArray(productosRecientes) ? productosRecientes : [];
    const q = String(searchQuery || '').trim().toLowerCase();
    const cat = String(categoriaFiltro || '').trim();

    return list.filter((p) => {
      if (cat && String(p?.categoria || '').trim() !== cat) return false;
      if (!q) return true;

      const nombre = String(p?.nombre || '').toLowerCase();
      const descripcion = String(p?.descripcion || '').toLowerCase();
      const categoria = String(p?.categoria || '').toLowerCase();
      return nombre.includes(q) || descripcion.includes(q) || categoria.includes(q);
    });
  }, [productosRecientes, searchQuery, categoriaFiltro]);

  if (cargandoProductos) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-neutral-50">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3 text-neutral-400" size={28} />
          <p className="text-sm text-neutral-500">Cargando productos…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    <div className="min-h-screen bg-neutral-50">
      <GestionCategoriasModal
        open={gestionarCategoriasOpen}
        onClose={() => setGestionarCategoriasOpen(false)}
        categorias={categorias}
        onCreate={async (nombre) => {
          // Si se crea desde el gestor, no auto-asignamos a un producto.
          setCategoriaTargetProductoId(null);
          return createCategoria(nombre);
        }}
        onDelete={async (id) => {
          await removeCategoria(id);
        }}
        guardando={guardandoCategoria}
        eliminandoId={eliminandoCategoriaId}
        notify={pushToast}
      />

      <NuevaCategoriaModal
        open={nuevaCategoriaOpen}
        onClose={() => {
          setNuevaCategoriaOpen(false);
          setCategoriaTargetProductoId(null);
        }}
        onCreate={onCreateCategoria}
        notify={pushToast}
      />

      <ProductoFormModal
        open={productoFormOpen}
        onClose={() => setProductoFormOpen(false)}
        onSubmit={handleProductFormSubmit}
        onDelete={handleEliminarProducto}
        initialData={productoParaEditar}
        notify={pushToast}
        categorias={categoriasNombres}
        onCreateCategoria={async (nombre) => {
          setCategoriaTargetProductoId(null);
          return onCreateCategoria(nombre);
        }}
        tasaBCV={tasaBCV}
        tasaUSDT={tasaUSDT}
        cargandoBCV={cargandoBCV}
        cargandoUSDT={cargandoUSDT}
        refrescarBCV={refrescarBCV}
        refrescarUSDT={refrescarUSDT}
        uploadImage={async (draftId, file) => {
          const storageId = draftId < 0 ? `temp-${Math.abs(draftId)}` : String(draftId);
          return uploadProductImage({ file, productId: storageId, ownerId });
        }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-28 md:py-6">
        {/* Tasas del día */}
        <section className="rounded-3xl bg-neutral-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">Tasas del día</p>
              <p className="mt-0.5 text-xs text-neutral-500">{productos.length} producto{productos.length === 1 ? '' : 's'} en este catálogo</p>
            </div>
            <button
              type="button"
              onClick={() => { refrescarBCV?.(); refrescarUSDT?.(); }}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
              title="Actualizar tasas"
              aria-label="Actualizar tasas"
            >
              <RefreshCw size={15} className={cargandoBCV || cargandoUSDT ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 divide-x divide-white/10">
            <div className="pr-4">
              <p className="text-xs text-neutral-400">BCV</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                {cargandoBCV ? '…' : formatearBs(tasaBCV)}
              </p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-neutral-400">USDT</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                {cargandoUSDT ? '…' : formatearBs(tasaUSDT)}
              </p>
            </div>
          </div>
        </section>

        {productosError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{productosError}</div>
        ) : null}
        {categoriasError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{categoriasError}</div>
        ) : null}

        {/* Encabezado de la lista */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Productos</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMostrarBs(!mostrarBs)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${mostrarBs ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-500 hover:bg-neutral-100'}`}
              title={mostrarBs ? 'Ocultar precios en Bs' : 'Mostrar precios en Bs'}
              aria-label={mostrarBs ? 'Precios en Bs visibles. Tocar para ocultar' : 'Precios en Bs ocultos. Tocar para mostrar'}
              aria-pressed={mostrarBs}
            >
              {mostrarBs ? <Eye size={15} /> : <EyeOff size={15} />}
              Bs
            </button>
            <button
              type="button"
              onClick={() => setGestionarCategoriasOpen(true)}
              className="flex size-9 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"
              title="Gestionar categorías"
              aria-label="Gestionar categorías"
            >
              <Tags size={18} />
            </button>
            <button
              type="button"
              onClick={() => setProductosView(productosView === 'grid' ? 'list' : 'grid')}
              className="flex size-9 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"
              title={productosView === 'grid' ? 'Ver en lista' : 'Ver en cuadrícula'}
              aria-label="Cambiar vista"
            >
              {productosView === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAgregarProducto}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3.5 text-white shadow-sm hover:bg-neutral-800 active:scale-[0.99] transition md:w-auto md:px-6"
        >
          <Plus size={18} />
          <span className="font-semibold">Nuevo producto</span>
        </button>

        {/* Búsqueda */}
        <label className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3.5 focus-within:border-neutral-900">
          <Search size={17} className="shrink-0 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full w-full bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            placeholder="Buscar producto"
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-900" aria-label="Limpiar búsqueda">
              <X size={16} />
            </button>
          ) : null}
        </label>

        {/* Categorías */}
        {categoriasParaFiltro.length ? (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
            {['', ...categoriasParaFiltro].map((c) => {
              const active = categoriaFiltro === c
              return (
                <button
                  key={c || '__todas'}
                  type="button"
                  onClick={() => setCategoriaFiltro(c)}
                  className={
                    'h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors ' +
                    (active ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400')
                  }
                >
                  {c || 'Todas'}
                </button>
              )
            })}
          </div>
        ) : null}

        {searchQuery || categoriaFiltro ? (
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
            <span>
              {productosFiltradosDashboard.length} de {productosRecientes.length} productos
            </span>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setCategoriaFiltro(''); }}
              className="font-semibold text-neutral-900"
            >
              Limpiar
            </button>
          </div>
        ) : null}

        {/* Lista */}
        <section id="productos" className="mt-4">
          {productos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
              <Package size={28} className="mx-auto text-neutral-300" />
              <p className="mt-3 font-semibold text-neutral-900">Aún no tienes productos</p>
              <p className="mt-1 text-sm text-neutral-500">Agrega el primero y aparecerá en tu catálogo.</p>
              <button
                type="button"
                onClick={handleAgregarProducto}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white"
              >
                <Plus size={18} /> Nuevo producto
              </button>
            </div>
          ) : productosFiltradosDashboard.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-neutral-900">No se encontraron productos</p>
              <p className="mt-1 text-sm text-neutral-500">Prueba otra búsqueda o categoría.</p>
            </div>
          ) : productosView === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productosFiltradosDashboard.map((prod) => {
                const isVisible = prod.activo !== false
                const precio = calcularPrecioVenta(prod)
                return (
                  <div key={prod.id} className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white ${isVisible ? '' : 'opacity-60'}`}>
                    <button type="button" onClick={() => handleEditarProducto(prod)} className="block w-full text-left">
                      <div className="aspect-square w-full bg-neutral-100">
                        {prod.imagenUrl ? (
                          <img src={prod.imagenUrl} alt={prod.nombre || ''} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : null}
                      </div>
                      <div className="px-3 pt-2.5">
                        <p className="truncate text-sm font-medium text-neutral-900">{prod.nombre || 'Sin nombre'}</p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900">${formatearUsd(precio)}</p>
                        {mostrarBs ? <p className="text-[11px] tabular-nums text-neutral-500">Bs. {formatearUsd(precio * getTasaBCV())}</p> : null}
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-3 pb-3 pt-2">
                      <span className="truncate text-[11px] text-neutral-500">{isVisible ? 'Visible' : 'Oculto'}</span>
                      <VisibleSwitch isVisible={isVisible} onClick={() => handleToggleVisible(prod)} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
              {productosFiltradosDashboard.map((prod) => {
                const isVisible = prod.activo !== false
                const profitPct = Math.round(Number(prod.profit) || 0)
                const usdtValue = Number(prod.precioUSDT) || 0
                const precio = calcularPrecioVenta(prod)
                return (
                  <div key={prod.id} className={`flex items-center gap-3 px-3.5 py-3 ${isVisible ? '' : 'bg-neutral-50'}`}>
                    <button
                      type="button"
                      onClick={() => handleEditarProducto(prod)}
                      className={`flex min-w-0 flex-1 items-center gap-3 text-left ${isVisible ? '' : 'opacity-55'}`}
                      title="Editar producto"
                    >
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {prod.imagenUrl ? (
                          <img src={prod.imagenUrl} alt={prod.nombre || ''} className="h-full w-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-neutral-900">{prod.nombre || 'Sin nombre'}</p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {prod.isFixedPrice ? 'Precio fijo' : `${profitPct}% ganancia`}
                          {prod.categoria ? ` · ${prod.categoria}` : ''}
                          {!prod.isFixedPrice ? (
                            <span className="hidden sm:inline"> · USDT ${formatearUsd(usdtValue)} · BCV real ${calcularPrecioRealBCV(usdtValue).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-semibold tabular-nums text-neutral-900">${formatearUsd(precio)}</p>
                        {mostrarBs ? <p className="text-[11px] tabular-nums text-neutral-500">Bs. {formatearUsd(precio * getTasaBCV())}</p> : null}
                      </div>
                    </button>
                    <VisibleSwitch isVisible={isVisible} onClick={() => handleToggleVisible(prod)} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

    </div>
    </>
  );
};

export default DashboardPrecios;

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Package, RefreshCw, Plus, Trash2, Save, Pencil, X, LayoutGrid, List, Tags } from 'lucide-react';
import { deleteStorageObject, getProductImagesBucketName, getStorageObjectFromPublicUrl, uploadProductImage } from '../lib/storage';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';
import { useCategorias } from '../hooks/useCategorias';
import { eliminarProducto, guardarCambiosProductos, setProductoActivo } from '../usecases/productosUsecases';
import ProductoFormModal from './ProductoFormModal';
import NuevaCategoriaModal from './NuevaCategoriaModal';
import GestionCategoriasModal from './GestionCategoriasModal';
import ToastStack from './ToastStack';
import { TOAST_TYPE, useToasts } from '../hooks/useToasts';

const DashboardPrecios = ({ ownerId } = {}) => {
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
  } = useProductos({ ownerId });
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
  } = useCategorias();

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" size={22} />
              Panel de Control
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={() => setGestionarCategoriasOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-900 hover:bg-gray-50 border border-gray-200"
              title="Gestionar categorías"
              type="button"
            >
              <Tags size={18} />
              <span className="hidden sm:inline">Categorías</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500">Productos</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{productos.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500">BCV (Bs.)</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{(parseFloat(tasaBCV) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500">USDT (Bs.)</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{(parseFloat(tasaUSDT) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {productosError ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {productosError}
          </div>
        ) : null}

        {categoriasError ? (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
            {categoriasError}
          </div>
        ) : null}

        <section id="productos" className="mb-6">
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 bg-white border-b border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAgregarProducto}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-950 text-white shadow-sm hover:bg-slate-900"
                >
                  <Plus size={18} />
                  <span className="font-semibold">Nuevo Producto</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProductosView('grid')}
                    className={`p-3 rounded-2xl border ${productosView === 'grid' ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}
                    title="Vista en grilla"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductosView('list')}
                    className={`p-3 rounded-2xl border ${productosView === 'list' ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-500 hover:text-gray-900'}`}
                    title="Vista en lista"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500">Buscar</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar por nombre, descripción o categoría"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500">Categoría</label>
                  <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas</option>
                    {categoriasParaFiltro.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {searchQuery || categoriaFiltro ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    Mostrando <span className="font-semibold text-gray-900">{productosFiltradosDashboard.length}</span> de{' '}
                    <span className="font-semibold text-gray-900">{productosRecientes.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoriaFiltro('');
                    }}
                    className="text-sm font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-4 md:p-6 bg-white">
              {productos.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay productos. ¡Agrega uno nuevo!
                </div>
              ) : productosFiltradosDashboard.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-gray-700 font-semibold">No se encontraron productos</div>
                  <div className="mt-1 text-sm text-gray-500">Prueba otra búsqueda o cambia la categoría.</div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoriaFiltro('');
                    }}
                    className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className={productosView === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'space-y-3 sm:space-y-4'}>
                  {productosFiltradosDashboard.map((prod) => {
                    const isVisible = prod.activo !== false;
                    const profitPct = Math.round(Number(prod.profit) || 0);
                    const usdtValue = Number(prod.precioUSDT) || 0;
                    const isEditing = false;
                    const hasChanges = false;
                    return (
                      <div
                        key={prod.id}
                        className={`rounded-2xl sm:rounded-3xl border border-gray-200 overflow-hidden ${isVisible ? 'bg-white' : 'bg-gray-50 opacity-80'}`}
                      >
                        <div className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                              {prod.imagenUrl ? (
                                <img
                                  src={prod.imagenUrl}
                                  alt={prod.nombre || 'Imagen del producto'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <div className="text-lg sm:text-xl font-extrabold text-gray-900 truncate text-left">
                                {prod.nombre || 'Sin nombre'}
                              </div>
                              <div className="mt-1.5 sm:mt-2 flex items-center justify-start gap-2 text-xs text-gray-500">
                                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-bold">
                                  {prod.isFixedPrice ? 'PRECIO FIJO' : `${profitPct}% PROFIT`}
                                </span>
                                {prod.categoria ? (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="truncate">{prod.categoria}</span>
                                  </>
                                ) : null}
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {!prod.isFixedPrice ? (
                                  <>
                                    <div className="hidden sm:block">
                                      <div className="text-xs font-bold text-gray-400 tracking-wider">USDT</div>
                                      <div className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums">
                                        ${usdtValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                    </div>
                                    <div className="hidden sm:block">
                                      <div className="text-xs font-bold text-gray-400 tracking-wider">BCV (REAL)</div>
                                      <div className="text-lg sm:text-xl font-black text-emerald-500 tabular-nums">
                                        ${calcularPrecioRealBCV(usdtValue).toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="hidden sm:block col-span-2">
                                    <div className="text-xs font-bold text-gray-400 tracking-wider">MODO</div>
                                    <div className="text-lg sm:text-xl font-bold text-blue-600 italic">
                                      Manual / Sin cálculo de tasa
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-[11px] sm:text-xs font-bold text-gray-400 tracking-wider">
                                    {prod.isFixedPrice ? 'PRECIO FINAL' : 'PÚBLICO'}
                                  </div>
                                  <div className="text-2xl sm:text-xl md:text-2xl font-black text-blue-600 tabular-nums leading-none">
                                    ${calcularPrecioVenta(prod).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between gap-3 shrink-0 relative self-stretch">
                            <button
                              type="button"
                              onClick={() => handleEditarProducto(prod)}
                              className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-gray-600 hover:bg-gray-50"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>


                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleVisible(prod)}
                                className={`relative inline-flex h-6 w-10 sm:h-7 sm:w-12 items-center rounded-full transition-colors ${isVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                aria-pressed={isVisible}
                                title={isVisible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}
                              >
                                <span
                                  className={`inline-block h-5 w-5 sm:h-6 sm:w-6 transform rounded-full bg-white transition-transform ${
                                    isVisible ? 'translate-x-4 sm:translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>


                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
    </>
  );
};

export default DashboardPrecios;

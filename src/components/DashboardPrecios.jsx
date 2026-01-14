import { useMemo, useRef, useState } from 'react';
import { Package, RefreshCw, Plus, Trash2, Save, Pencil, X, LayoutGrid, List, Tags } from 'lucide-react';
import { uploadProductImage } from '../lib/storage';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';
import { useCategorias } from '../hooks/useCategorias';
import { eliminarProducto, guardarCambiosProductos, setProductoActivo } from '../usecases/productosUsecases';
import NuevoProductoModal from './NuevoProductoModal';
import NuevaCategoriaModal from './NuevaCategoriaModal';
import GestionCategoriasModal from './GestionCategoriasModal';
import ToastStack from './ToastStack';
import { TOAST_TYPE, useToasts } from '../hooks/useToasts';

const DashboardPrecios = () => {
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
  } = useProductos();
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(new Set()); // Set de IDs con cambios
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState({}); // id -> boolean
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false);
  const [nuevaCategoriaOpen, setNuevaCategoriaOpen] = useState(false);
  const [gestionarCategoriasOpen, setGestionarCategoriasOpen] = useState(false);
  const [categoriaTargetProductoId, setCategoriaTargetProductoId] = useState(null);
  const [productosView, setProductosView] = useState('list'); // list | grid
  const [expandProductoId, setExpandProductoId] = useState(null);
  const editSnapshotsRef = useRef(new Map());

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
  const calcularPrecioVenta = (precioUSDT, profit) => {
    const precioRealBCVDolares = calcularPrecioRealBCV(precioUSDT);
    return precioRealBCVDolares * (1 + profit / 100);
  };

  const handleUpdateProducto = (id, campo, valor) => {
    // Actualización local inmediata
    let nuevoValor = valor;
    if (campo !== 'nombre' && campo !== 'descripcion' && campo !== 'categoria' && campo !== 'imagenUrl' && campo !== 'activo') {
      nuevoValor = valor === '' ? 0 : (parseFloat(valor) || 0);
    }

    setProductos(prev => prev.map(p => 
      p.id === id ? { ...p, [campo]: nuevoValor } : p
    ));

    // Marcar como no guardado
    setCambiosSinGuardar(prev => new Set(prev).add(id));
  };

  const handleAgregarProducto = () => {
    setNuevoProductoOpen(true);
  };

  const startEditingProducto = (prod) => {
    if (!prod) return;
    // Guardar snapshot solo la primera vez que se entra a editar ese producto.
    if (!editSnapshotsRef.current.has(prod.id)) {
      editSnapshotsRef.current.set(prod.id, { ...prod });
    }
    setExpandProductoId(prod.id);
  };

  const discardEditingProducto = (id) => {
    const snapshot = editSnapshotsRef.current.get(id);
    if (snapshot) {
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...snapshot } : p)));
    }
    setCambiosSinGuardar((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    editSnapshotsRef.current.delete(id);
    setExpandProductoId(null);
  };

  const handleCreateProductoFromModal = async (draftProducto) => {
    // Insertar optimista en UI, luego persistir inmediatamente.
    const productoConDefaults = {
      activo: true,
      ...draftProducto,
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
      // Revertir si falla
      setProductos((prev) => prev.filter((p) => p.id !== productoConDefaults.id));
      throw e;
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
      handleUpdateProducto(categoriaTargetProductoId, 'categoria', nombreCreado);
    }
    return created;
  };

  const handleToggleVisible = async (prod) => {
    const nextActivo = !(prod.activo !== false);

    // Si aún no está persistido, tratamos esto como un cambio normal.
    if (prod.id < 0) {
      handleUpdateProducto(prod.id, 'activo', nextActivo);
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

  const handleGuardarProducto = async (id) => {
    if (!id) return;

    setGuardando(true);
    try {
      const nuevosIdsMap = await guardarCambiosProductos({ productos, idsParaGuardar: [id] });

      // Si por alguna razón era temporal, actualiza al ID real
      if (nuevosIdsMap?.[id] != null) {
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, id: nuevosIdsMap[id] } : p)));
      }

      setCambiosSinGuardar((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Al guardar, el snapshot ya no sirve.
      editSnapshotsRef.current.delete(id);
      pushToast({ type: TOAST_TYPE.SUCCESS, title: 'Guardado', message: 'Cambios guardados.' });
    } catch (error) {
      console.error('Error al guardar producto:', error);
      const msg = error?.message || '';
      const msgLower = String(msg).toLowerCase();
      if (msgLower.includes('activo') && msgLower.includes('does not exist')) {
        pushToast({
          type: TOAST_TYPE.WARNING,
          title: 'Falta migración',
          message: 'Tu base de datos aún no tiene la columna "activo". Ejecuta el SQL actualizado en supabase-schema.sql.',
          durationMs: 6000,
        });
      } else if (msgLower.includes('categoria') && (msgLower.includes('does not exist') || msgLower.includes('no existe'))) {
        pushToast({
          type: TOAST_TYPE.WARNING,
          title: 'Falta migración',
          message: 'Tu base de datos aún no tiene la columna "categoria". Ejecuta el SQL actualizado en supabase-schema.sql.',
          durationMs: 6000,
        });
      } else {
        pushToast({ type: TOAST_TYPE.ERROR, title: 'Error', message: 'No se pudo guardar el producto.' });
      }
    } finally {
      setGuardando(false);
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

  const setSubiendo = (id, value) => {
    setSubiendoImagen(prev => ({ ...prev, [id]: value }));
  };

  const handleSubirImagen = async (id, file) => {
    if (!file) return;

    try {
      setSubiendo(id, true);

      // Si el producto aún no existe en BD, igual subimos y guardamos URL.
      // Quedará pendiente de persistir cuando se presione "Guardar Cambios".
      const storageId = id > 0 ? String(id) : `temp-${Math.abs(id)}`;
      const { publicUrl } = await uploadProductImage({ file, productId: storageId });

      setProductos(prev => prev.map(p => (p.id === id ? { ...p, imagenUrl: publicUrl } : p)));
      setCambiosSinGuardar(prev => new Set(prev).add(id));
    } catch (error) {
      console.error('Error al subir imagen:', error);
      pushToast({
        type: TOAST_TYPE.ERROR,
        title: 'Error',
        message: 'Error al subir imagen: ' + (error?.message || 'Desconocido'),
        durationMs: 6000,
      });
    } finally {
      setSubiendo(id, false);
    }
  };

  const handleQuitarImagen = (id) => {
    setProductos(prev => prev.map(p => (p.id === id ? { ...p, imagenUrl: '' } : p)));
    setCambiosSinGuardar(prev => new Set(prev).add(id));
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const productosRecientes = useMemo(() => {
    return Array.isArray(productos) ? productos : [];
  }, [productos]);

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

      <NuevoProductoModal
        open={nuevoProductoOpen}
        onClose={() => setNuevoProductoOpen(false)}
        onCreate={handleCreateProductoFromModal}
        notify={pushToast}
        categorias={categoriasNombres}
        onCreateCategoria={async (nombre) => {
          // categoría creada desde el modal de producto (sin target producto)
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
          return uploadProductImage({ file, productId: storageId });
        }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" size={22} />
              Dashboard
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setGestionarCategoriasOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-900 hover:bg-gray-50 border border-gray-200"
              title="Gestionar categorías"
              type="button"
            >
              <Tags size={18} />
              Categorías
            </button>
            <button
              onClick={handleAgregarProducto}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
              title="Agregar producto"
            >
              <Plus size={18} />
              Agregar
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
            </div>

            <div className="p-4 md:p-6 bg-white">
              {productos.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No hay productos. ¡Agrega uno nuevo!
                </div>
              ) : (
                <div className={productosView === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
                  {productosRecientes.map((prod) => {
                    const isVisible = prod.activo !== false;
                    const profitPct = Math.round(Number(prod.profit) || 0);
                    const usdtValue = Number(prod.precioUSDT) || 0;
                    const isEditing = expandProductoId === prod.id;
                    const hasChanges = cambiosSinGuardar.has(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className={`rounded-3xl border border-gray-200 overflow-hidden ${isVisible ? 'bg-white' : 'bg-gray-50 opacity-80'}`}
                      >
                        <div className="p-4 flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-20 h-20 sm:w-20 sm:h-20 rounded-3xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
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
                              <div className="text-xl sm:text-lg font-extrabold text-gray-900 truncate text-center sm:text-left">
                                {prod.nombre || 'Sin nombre'}
                              </div>
                              <div className="mt-2 flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                  {profitPct}% PROFIT
                                </span>
                                {prod.categoria ? (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="truncate">{prod.categoria}</span>
                                  </>
                                ) : null}
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                <div>
                                  <div className="text-xs font-bold text-gray-400 tracking-wider">PÚBLICO</div>
                                  <div className="text-3xl sm:text-xl font-black text-blue-600 tabular-nums leading-none">
                                    ${calcularPrecioVenta(usdtValue, Number(prod.profit) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between gap-3 shrink-0 relative self-stretch">
                            {!isEditing ? (
                              <button
                                type="button"
                                onClick={() => startEditingProducto(prod)}
                                className="p-2 rounded-2xl text-gray-600 hover:bg-gray-50"
                                title="Editar"
                              >
                                <Pencil size={18} />
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                {hasChanges ? (
                                  <button
                                    type="button"
                                    onClick={() => handleGuardarProducto(prod.id)}
                                    disabled={guardando}
                                    className="p-2 rounded-2xl text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                    title="Guardar"
                                  >
                                    <Save size={18} />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => discardEditingProducto(prod.id)}
                                  className="p-2 rounded-2xl text-gray-600 hover:bg-gray-50"
                                  title={hasChanges ? 'Cerrar y descartar cambios' : 'Cerrar edición'}
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleVisible(prod)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                aria-pressed={isVisible}
                                title={isVisible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo'}
                              >
                                <span
                                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                    isVisible ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="border-t border-gray-100 p-4 bg-gray-50">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="text-sm font-semibold text-gray-900">Editar producto</div>
                              <button
                                type="button"
                                onClick={() => confirmarEliminarProducto(prod.id)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-50"
                                title="Eliminar producto"
                              >
                                <Trash2 size={18} />
                                Eliminar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-gray-500">Nombre</div>
                                <input
                                  type="text"
                                  value={prod.nombre}
                                  onChange={(e) => handleUpdateProducto(prod.id, 'nombre', e.target.value)}
                                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Nombre del producto"
                                />
                              </div>

                              <div>
                                <div className="text-xs text-gray-500">Categoría</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <select
                                    value={prod.categoria || ''}
                                    onChange={(e) => handleUpdateProducto(prod.id, 'categoria', e.target.value)}
                                    className="flex-1 p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">Sin categoría</option>
                                    {(categoriasNombres || []).map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => abrirNuevaCategoria(prod.id)}
                                    disabled={guardandoCategoria}
                                    className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                                    title="Crear categoría"
                                  >
                                    Nueva
                                  </button>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Profit %</div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={prod.profit || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleUpdateProducto(prod.id, 'profit', value);
                                    }
                                  }}
                                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <div className="text-xs text-gray-500">Descripción</div>
                                <textarea
                                  value={prod.descripcion || ''}
                                  onChange={(e) => handleUpdateProducto(prod.id, 'descripcion', e.target.value)}
                                  placeholder="Breve descripción (opcional)"
                                  rows={2}
                                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <div className="text-xs text-gray-500">Imagen (URL)</div>
                                <input
                                  type="url"
                                  value={prod.imagenUrl || ''}
                                  onChange={(e) => handleUpdateProducto(prod.id, 'imagenUrl', e.target.value)}
                                  placeholder="https://…"
                                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <div className="text-xs text-gray-500">
                                    {subiendoImagen[prod.id] ? <span className="text-blue-700 animate-pulse">Subiendo…</span> : 'Subir archivo'}
                                  </div>
                                  {prod.imagenUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => handleQuitarImagen(prod.id)}
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      Quitar
                                    </button>
                                  ) : null}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={!!subiendoImagen[prod.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleSubirImagen(prod.id, file);
                                    e.target.value = '';
                                  }}
                                  className="mt-1 w-full text-sm"
                                />
                              </div>

                              <div>
                                <div className="text-xs text-gray-500">Precio USDT</div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={prod.precioUSDT || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleUpdateProducto(prod.id, 'precioUSDT', value);
                                    }
                                  }}
                                  className="mt-1 w-full p-2.5 border border-gray-200 rounded-xl bg-white text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0.00"
                                />

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                                    <div className="text-[11px] font-semibold text-blue-700">Real BCV ($)</div>
                                    <div className="mt-1 text-base font-semibold text-blue-900">
                                      ${calcularPrecioRealBCV(prod.precioUSDT).toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                                    <div className="text-[11px] font-semibold text-emerald-700">Venta final ($)</div>
                                    <div className="mt-1 text-base font-semibold text-emerald-900">
                                      ${calcularPrecioVenta(prod.precioUSDT, prod.profit).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        
      </div>

      <div className="fixed bottom-0 inset-x-0 md:hidden z-40">
        <div className="bg-white/90 backdrop-blur border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => scrollToSection('productos')}
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Package size={18} />
              Productos
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default DashboardPrecios;

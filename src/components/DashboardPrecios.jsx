import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Package, RefreshCw, Plus, Trash2, Save, Pencil, X, LayoutGrid, List, Tags } from 'lucide-react';
import { deleteStorageObject, getProductImagesBucketName, getStorageObjectFromPublicUrl, uploadProductImage } from '../lib/storage';
import { useProductos } from '../hooks/useProductos';
import { useTasas } from '../hooks/useTasas';
import { useCategorias } from '../hooks/useCategorias';
import { eliminarProducto, guardarCambiosProductos, setProductoActivo } from '../usecases/productosUsecases';
import NuevoProductoModal from './NuevoProductoModal';
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
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false);
  const [nuevaCategoriaOpen, setNuevaCategoriaOpen] = useState(false);
  const [gestionarCategoriasOpen, setGestionarCategoriasOpen] = useState(false);
  const [categoriaTargetProductoId, setCategoriaTargetProductoId] = useState(null);
  const [productosView, setProductosView] = useState('list'); // list | grid
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [expandProductoId, setExpandProductoId] = useState(null);
  const editSnapshotsRef = useRef(new Map());
  const pendingImageDeletesRef = useRef(new Map()); // id -> Set("bucket::path")

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
    pendingImageDeletesRef.current.delete(id);
    setExpandProductoId(null);
  };

  const queueImageDeleteFromUrl = (id, imageUrl) => {
    if (!ownerId) return;
    const meta = getStorageObjectFromPublicUrl(imageUrl);
    if (!meta) return;

    const bucket = getProductImagesBucketName();
    if (meta.bucket !== bucket) return;

    // Multi-tenant: solo borrar dentro de la carpeta del usuario.
    const allowedPrefix = `productos/${String(ownerId)}/`;
    if (!String(meta.path || '').startsWith(allowedPrefix)) return;

    const key = `${meta.bucket}::${meta.path}`;
    const set = pendingImageDeletesRef.current.get(id) || new Set();
    set.add(key);
    pendingImageDeletesRef.current.set(id, set);
  };

  const getProductoImagenes = (p) => {
    const list = Array.isArray(p?.imagenes) ? p.imagenes : [];
    const cleaned = list.map((u) => String(u || '').trim()).filter(Boolean);
    const fallback = String(p?.imagenUrl || '').trim();
    return cleaned.length ? cleaned : (fallback ? [fallback] : []);
  };

  const setProductoImagenes = (id, imagenes) => {
    const next = Array.isArray(imagenes) ? imagenes.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3) : [];
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, imagenes: next, imagenUrl: next[0] || '' } : p)));
    setCambiosSinGuardar((prev) => new Set(prev).add(id));
  };

  const moveProductoImagen = (id, fromIdx, direction) => {
    const current = productos.find((p) => p.id === id);
    const imgs = getProductoImagenes(current);
    const toIdx = fromIdx + (direction === 'left' ? -1 : 1);
    if (toIdx < 0 || toIdx >= imgs.length) return;
    const next = [...imgs];
    ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    setProductoImagenes(id, next);
  };

  const flushQueuedImageDeletes = async (id) => {
    const set = pendingImageDeletesRef.current.get(id);
    if (!set || set.size === 0) return;
    pendingImageDeletesRef.current.delete(id);

    for (const key of set) {
      const [bucket, path] = String(key).split('::');
      if (!bucket || !path) continue;
      try {
        await deleteStorageObject({ bucket, path });
      } catch (e) {
        console.warn('No se pudo borrar una imagen vieja:', e);
      }
    }
  };

  const handleCreateProductoFromModal = async (draftProducto) => {
    // Insertar optimista en UI, luego persistir inmediatamente.
    const productoConDefaults = {
      activo: true,
      ...(ownerId ? { ownerId } : {}),
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

      const realId = nuevosIdsMap?.[id] != null ? nuevosIdsMap[id] : id;

      // Si por alguna razón era temporal, actualiza al ID real
      if (realId !== id) {
        setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, id: realId } : p)));

        // Mover cola de borrado del id temporal al real.
        const queued = pendingImageDeletesRef.current.get(id);
        if (queued) {
          pendingImageDeletesRef.current.set(realId, queued);
          pendingImageDeletesRef.current.delete(id);
        }
      }

      setCambiosSinGuardar((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Al guardar, el snapshot ya no sirve.
      editSnapshotsRef.current.delete(id);

      // Limpieza: ahora sí borramos imágenes viejas encoladas.
      await flushQueuedImageDeletes(realId);
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

  const setSubiendo = (id, value) => {
    setSubiendoImagen(prev => ({ ...prev, [id]: value }));
  };

  const handleSubirImagen = async (id, file) => {
    if (!file) return;

    const current = productos.find((p) => p.id === id);
    const currentImages = getProductoImagenes(current);
    if (currentImages.length >= 3) {
      pushToast({
        type: TOAST_TYPE.WARNING,
        title: 'Límite de fotos',
        message: 'Máximo 3 fotos por producto.',
        durationMs: 3500,
      });
      return;
    }

    try {
      setSubiendo(id, true);

      // Si el producto aún no existe en BD, igual subimos y guardamos URL.
      // Quedará pendiente de persistir cuando se presione "Guardar Cambios".
      const storageId = id > 0 ? String(id) : `temp-${Math.abs(id)}`;
      const { publicUrl } = await uploadProductImage({ file, productId: storageId, ownerId });

      setProductoImagenes(id, [...currentImages, publicUrl]);
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

  const handleQuitarImagen = (id, idx) => {
    const current = productos.find((p) => p.id === id);
    const imgs = getProductoImagenes(current);
    const toRemove = imgs[idx];
    if (toRemove) queueImageDeleteFromUrl(id, toRemove);
    const next = imgs.filter((_, i) => i !== idx);
    setProductoImagenes(id, next);
  };

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
          return uploadProductImage({ file, productId: storageId, ownerId });
        }}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" size={22} />
              Dashboard
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
            <button
              onClick={handleAgregarProducto}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
              title="Agregar producto"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Agregar</span>
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
                    const isEditing = expandProductoId === prod.id;
                    const hasChanges = cambiosSinGuardar.has(prod.id);
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
                                  <div className="text-[11px] sm:text-xs font-bold text-gray-400 tracking-wider">PÚBLICO</div>
                                  <div className="text-2xl sm:text-xl md:text-2xl font-black text-blue-600 tabular-nums leading-none">
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
                                className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-gray-600 hover:bg-gray-50"
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
                                    className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                    title="Guardar"
                                  >
                                    <Save size={18} />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => discardEditingProducto(prod.id)}
                                  className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-gray-600 hover:bg-gray-50"
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
                                <div className="text-xs text-gray-500">Fotos (máx. 3)</div>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {(() => {
                                    const imgs = getProductoImagenes(prod).slice(0, 3)
                                    return [0, 1, 2].map((idx) => {
                                      const url = imgs[idx]

                                      if (!url) {
                                        const canUploadHere = idx === imgs.length && imgs.length < 3
                                        return (
                                          <div key={idx} className="aspect-square rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                                            {canUploadHere ? (
                                              <label className="h-full w-full flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer">
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  className="hidden"
                                                  disabled={!!subiendoImagen[prod.id]}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleSubirImagen(prod.id, file)
                                                    e.target.value = ''
                                                  }}
                                                />
                                                <span className="text-xs font-semibold">Subir</span>
                                                <span className="text-[10px]">{subiendoImagen[prod.id] ? 'Subiendo…' : 'Foto'}</span>
                                              </label>
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center text-gray-300 text-[10px]">Vacío</div>
                                            )}
                                          </div>
                                        )
                                      }

                                      return (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                                          <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />

                                          <div className="absolute top-1 left-1 flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => moveProductoImagen(prod.id, idx, 'left')}
                                              disabled={idx === 0 || !!subiendoImagen[prod.id]}
                                              className="rounded-full bg-white/90 text-gray-800 shadow p-1 disabled:opacity-40"
                                              title="Mover a la izquierda"
                                              aria-label="Mover a la izquierda"
                                            >
                                              <ArrowLeft size={14} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveProductoImagen(prod.id, idx, 'right')}
                                              disabled={idx === imgs.length - 1 || !!subiendoImagen[prod.id]}
                                              className="rounded-full bg-white/90 text-gray-800 shadow p-1 disabled:opacity-40"
                                              title="Mover a la derecha"
                                              aria-label="Mover a la derecha"
                                            >
                                              <ArrowRight size={14} />
                                            </button>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleQuitarImagen(prod.id, idx)}
                                            className="absolute top-1 right-1 rounded-full bg-white/90 text-red-600 shadow px-2 py-1 text-[10px] font-semibold hover:bg-white"
                                            title="Quitar"
                                          >
                                            Quitar
                                          </button>
                                        </div>
                                      )
                                    })
                                  })()}
                                </div>
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
    </div>
    </>
  );
};

export default DashboardPrecios;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Package, RefreshCw, Plus, Trash2, Save } from 'lucide-react';
import { productoFromDb, productoToInsertDb, productoToUpdateDb } from '../lib/productos';
import { uploadProductImage } from '../lib/storage';

const DashboardPrecios = () => {
  // Estados para las tasas globales (basado en la hoja de cálculo)
  // Usar strings para permitir valores vacíos en los inputs
  const [tasaBCV, setTasaBCV] = useState('365');
  const [tasaUSDT, setTasaUSDT] = useState('800');
  const [cargandoBCV, setCargandoBCV] = useState(false);
  const [cargandoUSDT, setCargandoUSDT] = useState(false);
  
  // Estado de productos
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(new Set()); // Set de IDs con cambios
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState({}); // id -> boolean

  // Cargar productos y suscribirse a cambios
  useEffect(() => {
    cargarProductos();
    
    const subscription = supabase
      .channel('productos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nuevo = productoFromDb(payload.new);
            if (!nuevo) return;
            setProductos(prev => [nuevo, ...prev.filter(p => p.id !== nuevo.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const actualizado = productoFromDb(payload.new);
            if (!actualizado) return;
            setProductos(prev => prev.map(p => (p.id === actualizado.id ? actualizado : p)));
          } else if (payload.eventType === 'DELETE') {
            const id = payload?.old?.id;
            if (!id) return;
            setProductos(prev => prev.filter(p => p.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const cargarProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear campos de BD a estado local si es necesario
      // En este caso, la BD usa snake_case (precio_usdt) y el front camelCase (precioUSDT)
      // Pero para simplificar, adaptaremos el estado local para usar lo que viene de la BD
      // O transformamos aquí. Vamos a transformar para mantener compatibilidad con el render.
      setProductos((data || []).map(productoFromDb).filter(Boolean));
    } catch (error) {
      console.error('Error al cargar productos:', error);
      alert('Error al cargar productos: ' + error.message);
    } finally {
      setCargandoProductos(false);
    }
  };

  // CRUD Operations
  const guardarProductoBD = async (producto) => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([productoToInsertDb(producto)])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar: ' + error.message);
      return null;
    }
  };

  const actualizarProductoBD = async (id, cambios) => {
    try {
      const cambiosBD = productoToUpdateDb(cambios);

      const { error } = await supabase
        .from('productos')
        .update(cambiosBD)
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('Error al actualizar: ' + error.message);
      return false;
    }
  };

  const eliminarProductoBD = async (id) => {
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar: ' + error.message);
      return false;
    }
  };

  // Función para obtener tasa BCV desde la API de dolarvzla.com
  const obtenerTasaBCV = useCallback(async () => {
    setCargandoBCV(true);
    try {
      const response = await fetch('https://api.dolarvzla.com/public/exchange-rate');
      if (!response.ok) {
        throw new Error('Error al obtener la tasa BCV');
      }
      const data = await response.json();
      
      // La API devuelve: {"current":{"usd":330.3751,"eur":384.33196133,"date":"2026-01-13"},...}
      // Obtenemos el valor USD del objeto current
      if (data.current && data.current.usd) {
        const tasa = data.current.usd;
        // Redondear a 2 decimales y convertir a string
        setTasaBCV(tasa.toFixed(2));
      }
    } catch (error) {
      console.error('Error al obtener la tasa BCV:', error);
      // Si falla, mantener el valor por defecto
    } finally {
      setCargandoBCV(false);
    }
  }, []);

  // Función para obtener tasa USDT desde la API de CriptoYa
  const obtenerTasaUSDT = useCallback(async () => {
    setCargandoUSDT(true);
    try {
      const response = await fetch('https://criptoya.com/api/binancep2p/usdt/ves');
      if (!response.ok) {
        throw new Error('Error al obtener la tasa USDT');
      }
      const data = await response.json();
      
      // La API devuelve: {"ask":556.499,"bid":555,"totalAsk":556.499,"totalBid":555,"time":1768075151}
      // Calculamos el promedio entre ask (venta) y bid (compra)
      if (data.ask && data.bid) {
        const promedio = (parseFloat(data.ask) + parseFloat(data.bid)) / 2;
        setTasaUSDT(promedio.toFixed(2));
      } else if (data.ask) {
        // Si solo hay ask, usar ese valor
        setTasaUSDT(parseFloat(data.ask).toFixed(2));
      } else if (data.bid) {
        // Si solo hay bid, usar ese valor
        setTasaUSDT(parseFloat(data.bid).toFixed(2));
      }
    } catch (error) {
      console.error('Error al obtener la tasa USDT:', error);
      // Si falla, mantener el valor por defecto
    } finally {
      setCargandoUSDT(false);
    }
  }, []);

  // Obtener tasas desde las APIs al cargar el componente
  useEffect(() => {
    obtenerTasaBCV();
    obtenerTasaUSDT();
  }, [obtenerTasaBCV, obtenerTasaUSDT]);

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
    if (campo !== 'nombre' && campo !== 'descripcion' && campo !== 'imagenUrl') {
      nuevoValor = valor === '' ? 0 : (parseFloat(valor) || 0);
    }

    setProductos(prev => prev.map(p => 
      p.id === id ? { ...p, [campo]: nuevoValor } : p
    ));

    // Marcar como no guardado
    setCambiosSinGuardar(prev => new Set(prev).add(id));
  };

  const handleAgregarProducto = () => {
    // Crear ID temporal negativo para identificar que es nuevo localmente
    const tempId = -(Date.now()); 
    const nuevoProducto = {
      id: tempId,
      nombre: '',
      descripcion: '',
      imagenUrl: '',
      precioUSDT: 0,
      profit: 30
    };
    
    setProductos(prev => [nuevoProducto, ...prev]);
    setCambiosSinGuardar(prev => new Set(prev).add(tempId));
  };

  const handleGuardarTodo = async () => {
    if (cambiosSinGuardar.size === 0) return;
    
    setGuardando(true);
    const idsParaGuardar = Array.from(cambiosSinGuardar);
    const nuevosIdsMap = {}; // Mapa de ID temporal -> ID real

    try {
      // Procesar todas las actualizaciones
      for (const id of idsParaGuardar) {
        const producto = productos.find(p => p.id === id);
        if (!producto) continue;

        if (id < 0) {
          // Es nuevo (INSERT)
          const nuevoProductoBD = await guardarProductoBD(producto);
          if (nuevoProductoBD) {
            nuevosIdsMap[id] = nuevoProductoBD.id;
          }
        } else {
          // Es existente (UPDATE)
          await actualizarProductoBD(id, {
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            imagenUrl: producto.imagenUrl,
            precioUSDT: producto.precioUSDT,
            profit: producto.profit
          });
        }
      }

      // Actualizar estado local con los nuevos IDs reales
      if (Object.keys(nuevosIdsMap).length > 0) {
        setProductos(prev => prev.map(p => 
          nuevosIdsMap[p.id] ? { ...p, id: nuevosIdsMap[p.id] } : p
        ));
      }

      // Limpiar cambios sin guardar
      setCambiosSinGuardar(new Set());
      alert('¡Cambios guardados correctamente!');
    } catch (error) {
      console.error('Error al guardar todo:', error);
      alert('Ocurrió un error al guardar algunos cambios.');
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
      const exito = await eliminarProductoBD(id);
      if (!exito) {
        // Si falla, revertir (volver a agregar)
        setProductos(prev => [...prev, productoEliminado]);
        alert('No se pudo eliminar el producto');
      }
    }
  };

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
      alert('Error al subir imagen: ' + (error?.message || 'Desconocido'));
    } finally {
      setSubiendo(id, false);
    }
  };

  const handleQuitarImagen = (id) => {
    setProductos(prev => prev.map(p => (p.id === id ? { ...p, imagenUrl: '' } : p)));
    setCambiosSinGuardar(prev => new Set(prev).add(id));
  };

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
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8 flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
          <Package className="text-blue-600 hidden md:block" /> 
          <span className="flex items-center gap-2">
            <Package className="text-blue-600 md:hidden" />
            Tabulador de Precios
          </span>
        </h1>

        {/* Sección de Tasas */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw size={20} /> Configuración de Tasas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <label className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <DollarSign size={18} className="text-blue-600" /> TASA BCV (Bs.)
                {cargandoBCV && (
                  <span className="text-xs text-blue-500 animate-pulse">Cargando...</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={tasaBCV} 
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir valores vacíos o solo números y punto decimal
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setTasaBCV(value);
                    }
                  }}
                  disabled={cargandoBCV}
                  className="flex-1 min-w-0 text-2xl md:text-3xl font-bold text-blue-700 bg-transparent border-b-2 border-blue-300 focus:border-blue-500 outline-none py-2 disabled:opacity-50"
                  placeholder="0.00"
                />
                <button
                  onClick={obtenerTasaBCV}
                  disabled={cargandoBCV}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title="Actualizar tasa BCV"
                >
                  <RefreshCw size={20} className={cargandoBCV ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tasa de cambio BCV en Bolívares (actualizada automáticamente)</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <label className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> TASA USDT (Bs.)
                {cargandoUSDT && (
                  <span className="text-xs text-green-500 animate-pulse">Cargando...</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={tasaUSDT} 
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir valores vacíos o solo números y punto decimal
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setTasaUSDT(value);
                    }
                  }}
                  disabled={cargandoUSDT}
                  className="flex-1 min-w-0 text-2xl md:text-3xl font-bold text-green-700 bg-transparent border-b-2 border-green-300 focus:border-green-500 outline-none py-2 disabled:opacity-50"
                  placeholder="0.00"
                />
                <button
                  onClick={obtenerTasaUSDT}
                  disabled={cargandoUSDT}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title="Actualizar tasa USDT"
                >
                  <RefreshCw size={20} className={cargandoUSDT ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tasa de cambio USDT en Bolívares (promedio de Binance P2P - actualizada automáticamente)</p>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 bg-gray-50 gap-4 md:gap-0">
            <h2 className="text-lg font-semibold text-gray-800">Productos</h2>
            <div className="flex w-full md:w-auto gap-3">
              <button
                onClick={handleGuardarTodo}
                disabled={guardando || cambiosSinGuardar.size === 0}
                className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-md ${
                  cambiosSinGuardar.size > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save size={18} />
                <span className="md:hidden">Guardar</span>
                <span className="hidden md:inline">{guardando ? 'Guardando...' : `Guardar Cambios${cambiosSinGuardar.size > 0 ? ` (${cambiosSinGuardar.size})` : ''}`}</span>
              </button>
              <button
                onClick={handleAgregarProducto}
                className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus size={18} /> <span className="md:hidden">Agregar</span><span className="hidden md:inline">Agregar Producto</span>
              </button>
            </div>
          </div>
          
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden bg-gray-50 p-4 space-y-4">
            {productos.map((prod) => (
              <div key={prod.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Producto</label>
                    <input 
                      type="text" 
                      value={prod.nombre}
                      onChange={(e) => handleUpdateProducto(prod.id, 'nombre', e.target.value)}
                      placeholder="Nombre del producto"
                      className="w-full mt-1 p-2 border rounded text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <label className="mt-3 block text-xs font-bold text-gray-500 uppercase">Descripción</label>
                    <textarea
                      value={prod.descripcion || ''}
                      onChange={(e) => handleUpdateProducto(prod.id, 'descripcion', e.target.value)}
                      placeholder="Breve descripción (opcional)"
                      rows={2}
                      className="w-full mt-1 p-2 border rounded text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <label className="mt-3 block text-xs font-bold text-gray-500 uppercase">Imagen (URL)</label>
                    <input
                      type="url"
                      value={prod.imagenUrl || ''}
                      onChange={(e) => handleUpdateProducto(prod.id, 'imagenUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full mt-1 p-2 border rounded text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">O subir archivo</label>
                      {subiendoImagen[prod.id] ? (
                        <span className="text-xs text-blue-600 animate-pulse">Subiendo...</span>
                      ) : null}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!!subiendoImagen[prod.id]}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSubirImagen(prod.id, file);
                        // permitir volver a seleccionar el mismo archivo
                        e.target.value = '';
                      }}
                      className="w-full mt-1 text-sm"
                    />

                    {prod.imagenUrl ? (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleQuitarImagen(prod.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    ) : null}

                    {prod.imagenUrl ? (
                      <img
                        src={prod.imagenUrl}
                        alt={prod.nombre || 'Imagen del producto'}
                        className="mt-3 w-full h-40 object-cover rounded-lg border border-gray-200"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleEliminarProducto(prod.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
                    title="Eliminar producto"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Precio USDT</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2 text-gray-400">$</span>
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
                        className="w-full pl-6 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Profit %</label>
                    <div className="relative mt-1">
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
                        className="w-full p-2 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2 text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div className="bg-blue-50 p-2 rounded">
                    <label className="text-[10px] font-bold text-blue-600 uppercase block">Real BCV</label>
                    <span className="text-lg font-bold text-blue-700">
                      ${calcularPrecioRealBCV(prod.precioUSDT).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <label className="text-[10px] font-bold text-green-600 uppercase block">Venta Final</label>
                    <span className="text-lg font-bold text-green-700">
                      ${calcularPrecioVenta(prod.precioUSDT, prod.profit).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {productos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay productos. ¡Agrega uno nuevo!
              </div>
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="p-4 font-semibold">PRODUCTO</th>
                  <th className="p-4 text-center font-semibold">PRECIO USDT ($)</th>
                  <th className="p-4 text-center font-semibold">PRECIO REAL BCV ($)</th>
                  <th className="p-4 text-center font-semibold">PROFIT (%)</th>
                  <th className="p-4 text-center font-semibold">PRECIO DE VENTA ($)</th>
                  <th className="p-4 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={prod.nombre}
                        onChange={(e) => handleUpdateProducto(prod.id, 'nombre', e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full p-2 border rounded text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />

                      <textarea
                        value={prod.descripcion || ''}
                        onChange={(e) => handleUpdateProducto(prod.id, 'descripcion', e.target.value)}
                        placeholder="Descripción breve (opcional)"
                        rows={2}
                        className="w-full mt-2 p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="url"
                          value={prod.imagenUrl || ''}
                          onChange={(e) => handleUpdateProducto(prod.id, 'imagenUrl', e.target.value)}
                          placeholder="Imagen (URL)"
                          className="flex-1 p-2 border rounded text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {prod.imagenUrl ? (
                          <img
                            src={prod.imagenUrl}
                            alt={prod.nombre || 'Imagen del producto'}
                            className="w-14 h-14 object-cover rounded border border-gray-200"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!!subiendoImagen[prod.id]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSubirImagen(prod.id, file);
                            e.target.value = '';
                          }}
                          className="text-sm"
                        />

                        <div className="flex items-center gap-3">
                          {subiendoImagen[prod.id] ? (
                            <span className="text-xs text-blue-600 animate-pulse">Subiendo...</span>
                          ) : null}
                          {prod.imagenUrl ? (
                            <button
                              type="button"
                              onClick={() => handleQuitarImagen(prod.id)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Quitar imagen
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={prod.precioUSDT || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Permitir valores vacíos o solo números y punto decimal
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            handleUpdateProducto(prod.id, 'precioUSDT', value);
                          }
                        }}
                        className="w-24 p-2 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-4 text-center font-semibold text-blue-700 bg-blue-50">
                      ${calcularPrecioRealBCV(prod.precioUSDT).toLocaleString('es-VE', {minimumFractionDigits: 4, maximumFractionDigits: 4})}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={prod.profit || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Permitir valores vacíos o solo números y punto decimal
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              handleUpdateProducto(prod.id, 'profit', value);
                            }
                          }}
                          className="w-20 p-2 border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-gray-500 font-medium">%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-green-700 bg-green-50">
                      ${calcularPrecioVenta(prod.precioUSDT, prod.profit).toLocaleString('es-VE', {minimumFractionDigits: 4, maximumFractionDigits: 4})}
                    </td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEliminarProducto(prod.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información y Notas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Package size={16} /> Información del Cálculo
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>PRECIO REAL BCV ($)</strong> = (PRECIO USDT × TASA USDT) / TASA BCV</li>
              <li>• <strong>PRECIO DE VENTA ($)</strong> = PRECIO REAL BCV ($) × (1 + PROFIT%)</li>
            </ul>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <RefreshCw size={16} /> Notas
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Los cambios en las tasas se aplican instantáneamente</li>
              <li>• Puedes agregar múltiples productos</li>
              <li>• Todos los campos son editables</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPrecios;

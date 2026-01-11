import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Package, RefreshCw, Plus, Trash2 } from 'lucide-react';

const DashboardPrecios = () => {
  // Estados para las tasas globales (basado en la hoja de cálculo)
  // Usar strings para permitir valores vacíos en los inputs
  const [tasaBCV, setTasaBCV] = useState('365');
  const [tasaUSDT, setTasaUSDT] = useState('800');
  const [cargandoBCV, setCargandoBCV] = useState(false);
  const [cargandoUSDT, setCargandoUSDT] = useState(false);
  
  // Productos hardcodeados
  const [productos, setProductos] = useState([
    { id: 1, nombre: 'papa chip', precioUSDT: 54, profit: 22 },
    { id: 2, nombre: 'papa congelada', precioUSDT: 21, profit: 22 },
    { id: 3, nombre: 'facilita kraft', precioUSDT: 8, profit: 22 },
  ]);

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
    if (campo === 'nombre') {
      setProductos(productos.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      ));
    } else {
      // Para campos numéricos, convertir a número (0 si está vacío o inválido)
      const numValue = valor === '' ? 0 : (parseFloat(valor) || 0);
      setProductos(productos.map(p => 
        p.id === id ? { ...p, [campo]: numValue } : p
      ));
    }
  };

  const handleAgregarProducto = () => {
    const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
    setProductos([...productos, { 
      id: nuevoId, 
      nombre: '', 
      precioUSDT: 0, 
      profit: 22 
    }]);
  };

  const handleEliminarProducto = (id) => {
    if (productos.length > 1) {
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
          <Package className="text-blue-600" /> Tabulador de Precios Interactivo
        </h1>

        {/* Sección de Tasas */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw size={20} /> Configuración de Tasas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
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
                  className="flex-1 text-3xl font-bold text-blue-700 bg-transparent border-b-2 border-blue-300 focus:border-blue-500 outline-none py-2 disabled:opacity-50"
                  placeholder="0.00"
                />
                <button
                  onClick={obtenerTasaBCV}
                  disabled={cargandoBCV}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Actualizar tasa BCV"
                >
                  <RefreshCw size={20} className={cargandoBCV ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tasa de cambio BCV en Bolívares (actualizada automáticamente)</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
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
                  className="flex-1 text-3xl font-bold text-green-700 bg-transparent border-b-2 border-green-300 focus:border-green-500 outline-none py-2 disabled:opacity-50"
                  placeholder="0.00"
                />
                <button
                  onClick={obtenerTasaUSDT}
                  disabled={cargandoUSDT}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Productos</h2>
            <button
              onClick={handleAgregarProducto}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus size={18} /> Agregar Producto
            </button>
          </div>
          <div className="overflow-x-auto">
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
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleEliminarProducto(prod.id)}
                        disabled={productos.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

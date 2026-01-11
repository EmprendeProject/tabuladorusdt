/**
 * EJEMPLO: Dashboard con Supabase
 * 
 * Este es un ejemplo de cómo integrar Supabase en tu DashboardPrecios
 * para guardar y cargar productos desde la base de datos.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Package, RefreshCw, Plus, Trash2 } from 'lucide-react';

const DashboardConSupabase = () => {
  const [tasaBCV, setTasaBCV] = useState('365');
  const [tasaUSDT, setTasaUSDT] = useState('800');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar productos desde Supabase al iniciar
  useEffect(() => {
    cargarProductos();
    
    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('productos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productos'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProductos(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProductos(prev =>
              prev.map(p => p.id === payload.new.id ? payload.new : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setProductos(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Función para cargar productos desde Supabase
  const cargarProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar datos de Supabase al formato del componente
      const productosFormateados = data.map(item => ({
        id: item.id,
        nombre: item.nombre,
        precioUSDT: item.precio_usdt,
        profit: item.profit
      }));

      setProductos(productosFormateados);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setCargando(false);
    }
  };

  // Función para guardar un producto en Supabase
  const guardarProducto = async (producto) => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([
          {
            nombre: producto.nombre,
            precio_usdt: producto.precioUSDT,
            profit: producto.profit
          }
        ])
        .select();

      if (error) throw error;

      // El producto se agregará automáticamente por la suscripción en tiempo real
      return data[0];
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
      return null;
    }
  };

  // Función para actualizar un producto en Supabase
  const actualizarProducto = async (id, cambios) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: cambios.nombre,
          precio_usdt: cambios.precioUSDT,
          profit: cambios.profit
        })
        .eq('id', id);

      if (error) throw error;

      // La actualización se reflejará automáticamente por la suscripción
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      alert('Error al actualizar el producto');
    }
  };

  // Función para eliminar un producto de Supabase
  const eliminarProducto = async (id) => {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // La eliminación se reflejará automáticamente por la suscripción
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  // Función para manejar cambios en productos
  const handleUpdateProducto = (id, campo, valor) => {
    const productoActualizado = productos.map(p =>
      p.id === id
        ? { ...p, [campo]: campo === 'nombre' ? valor : (parseFloat(valor) || 0) }
        : p
    );
    
    setProductos(productoActualizado);

    // Guardar en Supabase después de un pequeño delay (debounce)
    const producto = productoActualizado.find(p => p.id === id);
    if (producto) {
      setTimeout(() => {
        actualizarProducto(id, {
          nombre: producto.nombre,
          precioUSDT: producto.precioUSDT,
          profit: producto.profit
        });
      }, 1000); // Esperar 1 segundo después del último cambio
    }
  };

  const handleAgregarProducto = async () => {
    const nuevoProducto = {
      nombre: '',
      precioUSDT: 0,
      profit: 22
    };

    // Agregar localmente primero para feedback inmediato
    const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
    setProductos([...productos, { id: nuevoId, ...nuevoProducto }]);

    // Guardar en Supabase
    const resultado = await guardarProducto(nuevoProducto);
    if (resultado) {
      // Reemplazar el ID temporal con el ID real de Supabase
      setProductos(prev =>
        prev.map(p => p.id === nuevoId ? { ...p, id: resultado.id } : p)
      );
    }
  };

  const handleEliminarProducto = async (id) => {
    if (productos.length > 1) {
      setProductos(productos.filter(p => p.id !== id));
      await eliminarProducto(id);
    }
  };

  // Resto del componente (cálculos, render, etc.)
  // ... (similar al DashboardPrecios original)

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Dashboard con Supabase</h1>
      {/* Resto del JSX del dashboard */}
    </div>
  );
};

export default DashboardConSupabase;

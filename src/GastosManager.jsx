import { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

export default function GastosManager({ userData }) {
  const [gastos, setGastos] = useState([]);
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('Alimentación');
  const [descripcion, setDescripcion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');

  const esAdmin = userData?.rol === 'admin';

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    let q;
    const gastosRef = collection(db, 'gastos');

    if (esAdmin) {
      // La mamá ve todos los gastos ordenados por fecha
      q = query(gastosRef, orderBy('fecha', 'desc'));
    } else {
      // Integrante solo ve sus propios gastos
      q = query(
        gastosRef, 
        where('userId', '==', userData.uid), 
        orderBy('fecha', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGastos(docs);
    });

    return () => unsubscribe();
  }, [userData, esAdmin]);

  // Guardar un nuevo gasto
  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return;

    try {
      await addDoc(collection(db, 'gastos'), {
        userId: userData.uid,
        usuarioNombre: userData.nombre,
        monto: parseFloat(monto),
        categoria,
        descripcion,
        fecha: serverTimestamp()
      });

      setMonto('');
      setDescripcion('');
    } catch (error) {
      console.error("Error al registrar gasto:", error);
    }
  };

  // Filtrado opcional para la vista de la administradora
  const gastosFiltrados = esAdmin && filtroUsuario !== 'todos'
    ? gastos.filter(g => g.usuarioNombre === filtroUsuario)
    : gastos;

  // Lista de nombres únicos para el filtro de la administradora
  const usuariosUnicos = [...new Set(gastos.map(g => g.usuarioNombre))];

  // Cálculo de total
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (g.monto || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
      
      {/* Formulario de registro de gasto */}
      <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h3>Registrar Nuevo Gasto</h3>
        <form onSubmit={handleGuardarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Monto ($)" 
            value={monto} 
            onChange={(e) => setMonto(e.target.value)} 
            required 
          />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="Alimentación">Alimentación</option>
            <option value="Transporte">Transporte</option>
            <option value="Servicios">Servicios Básicos</option>
            <option value="Estudios">Estudios / Universidad</option>
            <option value="Varios">Varios</option>
          </select>
          <input 
            type="text" 
            placeholder="Descripción (ej. Compra de víveres)" 
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)} 
            required 
          />
          <button type="submit" style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px' }}>
            Guardar Gasto
          </button>
        </form>
      </section>

      {/* Histórico e informe */}
      <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{esAdmin ? 'Panel de Control de Gastos Familiares' : 'Mis Gastos Reportados'}</h3>
          <h4>Total: ${totalGastos.toFixed(2)}</h4>
        </div>

        {/* Filtro por usuario (solo visible para Administradora) */}
        {esAdmin && (
          <div style={{ marginBottom: '15px' }}>
            <label>Filtrar por integrante: </label>
            <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
              <option value="todos">Todos los integrantes</option>
              {usuariosUnicos.map((nombre, i) => (
                <option key={i} value={nombre}>{nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tabla / Lista del histórico */}
        {gastosFiltrados.length === 0 ? (
          <p>No hay gastos registrados aún.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gastosFiltrados.map((g) => (
              <li key={g.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{g.descripcion}</strong> ({g.categoria})
                  <br />
                  <small style={{ color: '#666' }}>
                    {esAdmin && <span>Por: <b>{g.usuarioNombre}</b> | </span>}
                    {g.fecha ? new Date(g.fecha.seconds * 1000).toLocaleDateString() : 'Procesando...'}
                  </small>
                </div>
                <span style={{ fontWeight: 'bold', color: '#d9534f' }}>
                  -${parseFloat(g.monto).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
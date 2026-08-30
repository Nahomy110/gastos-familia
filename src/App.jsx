import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Auth from './Auth';
import GastosManager from './GastosManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Cargando...</p>;

  if (!user) {
    return <Auth onLogin={(data) => setUserData(data)} />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Hola, {userData?.nombre || 'Usuario'}</h2>
        <button onClick={() => signOut(auth)}>Cerrar Sesión</button>
      </header>

      <p>Rol: <strong>{userData?.rol === 'admin' ? 'Administradora (Mamá)' : 'Integrante'}</strong></p>

      {/* Componente principal de gastos */}
      {userData && <GastosManager userData={userData} />}
    </div>
  );
}
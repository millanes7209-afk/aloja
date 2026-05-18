import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation is handled automatically by AuthContext in App.tsx
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no encontrado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Adorno visual (Borde superior dorado) */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary font-title tracking-wider flex items-center justify-center gap-2">
            <span className="text-5xl">🥷</span> ALOJA
          </h1>
          <p className="text-muted-foreground mt-2">Sistema de Punto de Venta</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Correo Electrónico</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-4"
          >
            {loading ? 'Entrando...' : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to="/recuperar"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 w-full"
          >
            <KeyRound size={14} />
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  );
}

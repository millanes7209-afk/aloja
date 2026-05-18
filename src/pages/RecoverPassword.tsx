import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecoverPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      setError('Error al intentar enviar el correo de recuperación. Verifica la dirección.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Adorno visual */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>

        <div className="mb-6">
          <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium w-fit mb-4">
            <ArrowLeft size={16} />
            Volver al Login
          </Link>
          <h1 className="text-3xl font-bold text-foreground font-title tracking-wide flex items-center gap-2">
            <KeyRound className="text-primary" />
            Recuperar Contraseña
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-500 p-3 rounded-md mb-6 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 mt-4"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      </div>
    </div>
  );
}

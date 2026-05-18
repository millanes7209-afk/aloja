import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <span className="text-6xl mb-4">🥷</span>
      <h1 className="text-4xl font-bold text-primary font-title mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mb-4">Página no encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Lo sentimos, la página que estás buscando no existe o ha sido movida.
      </p>
      <Link 
        to="/"
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
      >
        <Home size={18} />
        Volver al Inventario
      </Link>
    </div>
  );
}

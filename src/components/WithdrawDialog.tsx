import { useState, useEffect } from 'react';
import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WithdrawDialogProps {
  onClose: () => void;
}

export default function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const { currentUser, userData } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      const docRef = doc(db, 'settings', 'cashRegister');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      } else {
        setBalance(0);
      }
    }
    fetchBalance();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    if (balance !== null && withdrawAmount > balance) {
      alert('No puedes retirar más de lo que hay en caja.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, ingresa una justificación o descripción.');
      return;
    }

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const cashRegisterRef = doc(db, 'settings', 'cashRegister');
        const cashDoc = await transaction.get(cashRegisterRef);
        let currentBalance = 0;
        
        if (cashDoc.exists()) {
          currentBalance = cashDoc.data().balance || 0;
        }

        if (currentBalance < withdrawAmount) {
          throw new Error('Saldo insuficiente en el momento de la transacción.');
        }

        transaction.update(cashRegisterRef, {
          balance: currentBalance - withdrawAmount
        });

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          amount: withdrawAmount,
          date: serverTimestamp(),
          description: `Retiro de caja: ${description}`,
          method: 'RETIRO',
          type: 'Egreso',
          userId: currentUser?.uid || 'desconocido',
          userName: userData?.name || currentUser?.email || 'Administrador',
          items: []
        });
      });

      alert('Retiro registrado exitosamente.');
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al registrar el retiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-title text-primary flex items-center gap-2">
            <DollarSign size={20} />
            Retirar Ganancias
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-muted/50 p-4 rounded-md border border-border text-center">
            <p className="text-sm text-muted-foreground mb-1">Balance actual en caja</p>
            <p className="text-2xl font-bold text-foreground">
              {balance !== null ? `${balance.toFixed(2)} Bs` : 'Cargando...'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monto a retirar (Bs)</label>
            <input 
              required
              type="number" 
              min="0.1" 
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descripción / Motivo</label>
            <textarea 
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              placeholder="Ej. Retiro semanal de ganancias..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading || balance === null || balance <= 0}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

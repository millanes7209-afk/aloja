import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product } from '../types';
import { X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NewPurchaseDialogProps {
  productId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewPurchaseDialog({ productId, onClose, onSuccess }: NewPurchaseDialogProps) {
  const { currentUser, userData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(productId || '');
  const [quantity, setQuantity] = useState('1');
  const [totalCost, setTotalCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const prods: Product[] = [];
      querySnapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      
      if (productId) {
        const prod = prods.find(p => p.id === productId);
        if (prod && prod.costPrice) {
          // Si ya tenía un precio de costo, pre-llenar asumiendo 1 cantidad para ayudar
          setTotalCost(prod.costPrice.toString());
        }
      }
    }
    fetchProducts();
  }, [productId]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity || !totalCost) return;

    const qtyVal = Number(quantity);
    const totalCostVal = Number(totalCost);
    const unitCost = totalCostVal / qtyVal;

    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const cashRegisterRef = doc(db, 'settings', 'cashRegister');
        const cashDoc = await transaction.get(cashRegisterRef);
        
        let currentBalance = 0;
        if (cashDoc.exists()) {
          currentBalance = cashDoc.data().balance || 0;
        } else {
          transaction.set(cashRegisterRef, { balance: 0 });
        }

        const productRef = doc(db, 'products', selectedProductId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw new Error("El producto no existe");
        }

        const productData = productDoc.data() as Product;

        if (currentBalance < totalCostVal) {
          throw new Error(`Saldo insuficiente en caja. Saldo actual: ${currentBalance} Bs. Costo total: ${totalCostVal} Bs.`);
        }

        transaction.update(cashRegisterRef, {
          balance: currentBalance - totalCostVal
        });

        const newStock = (productData.stock || 0) + qtyVal;
        transaction.update(productRef, {
          stock: newStock,
          costPrice: unitCost // Guardar el costo unitario recalculado
        });

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          amount: totalCostVal,
          date: serverTimestamp(),
          description: `Compra de stock: ${qtyVal} paq. de ${productData.name}`,
          method: 'COMPRA',
          type: 'Egreso',
          userId: currentUser?.uid || 'desconocido',
          userName: userData?.name || currentUser?.email || 'Administrador',
          items: [{
            productId: selectedProductId,
            name: productData.name,
            quantity: qtyVal,
            salePrice: productData.salePrice,
            costPrice: unitCost,
            mode: 'pack'
          }]
        });
      });

      alert('Compra registrada exitosamente y stock actualizado.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Hubo un error al registrar la compra');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-title text-primary">Registrar Compra (Abastecer Stock)</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Seleccionar Producto</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar por nombre o categoría..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm mb-2"
              />
            </div>
            
            <select 
              required
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const prod = products.find(p => p.id === e.target.value);
                if (prod && prod.costPrice) {
                  // Si cambiamos, pre-rellenamos el costo total asumiendo 1 paquete
                  setQuantity('1');
                  setTotalCost(prod.costPrice.toString());
                } else {
                  setTotalCost('');
                }
              }}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="">-- Elige un producto --</option>
              {filteredProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.category}] - Stock actual: {p.stock} paq.
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-muted/50 p-4 rounded-md border border-border text-sm space-y-1">
              <p><strong className="text-foreground">Detalles del Producto:</strong></p>
              <p className="text-muted-foreground">Precio de venta del paquete: <span className="text-primary font-medium">{selectedProduct.salePrice} Bs</span></p>
              {selectedProduct.isDivisible && (
                <p className="text-muted-foreground">Divisible: Sí ({selectedProduct.unitsPerPack} unidades/paquete a {selectedProduct.unitSalePrice} Bs c/u)</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Unidades</label>
              <input 
                required
                type="number" 
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Cantidad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Costo Total Pagado (Bs)</label>
              <input 
                required
                type="number" 
                min="0.1" step="0.1"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {quantity && totalCost && (
            <div className="pt-2 text-right">
              <p className="text-sm text-muted-foreground">
                Costo unitario calculado: <span className="text-primary font-bold">{(Number(totalCost) / Number(quantity)).toFixed(2)} Bs / paq.</span>
              </p>
            </div>
          )}

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
              disabled={loading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Registrando...' : 'Registrar Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

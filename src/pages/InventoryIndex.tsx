import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product } from '../types';
import { Plus, DollarSign, Package, ShoppingCart, Trash2, Edit2, Check, X } from 'lucide-react';
import NewProductModal from '../components/NewProductModal';
import EditProductModal from '../components/EditProductModal';
import NewPurchaseDialog from '../components/NewPurchaseDialog';
import WithdrawDialog from '../components/WithdrawDialog';
import { useAuth } from '../contexts/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  salePrice: number;
  mode: 'pack' | 'unit';
}

export default function InventoryIndex() {
  const { currentUser, userData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [purchaseProductId, setPurchaseProductId] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Editing states
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  
  const [editingSubtotalIndex, setEditingSubtotalIndex] = useState<number | null>(null);
  const [tempSubtotal, setTempSubtotal] = useState('');

  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');
  const [customTotal, setCustomTotal] = useState<number | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const inStockProducts = products.filter(p => p.stock > 0 || p.stockUnidades > 0);
  const outOfStockProducts = products.filter(p => p.stock <= 0 && p.stockUnidades <= 0);

  // --- CART LOGIC ---
  const addToCart = (product: Product, mode: 'pack' | 'unit') => {
    const defaultPrice = mode === 'pack' ? product.salePrice : product.unitSalePrice;
    const existingIndex = cart.findIndex(item => item.product.id === product.id && item.mode === mode);
    
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, salePrice: defaultPrice, mode }]);
    }
    setCustomTotal(null); // Clear custom total when modifying cart
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    setCustomTotal(null);
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const newCart = [...cart];
    newCart[index].quantity = newQty;
    setCart(newCart);
    setCustomTotal(null);
  };

  const saveEditedPrice = (index: number) => {
    const priceVal = Number(tempPrice);
    if (isNaN(priceVal) || priceVal < 0) return;
    const newCart = [...cart];
    newCart[index].salePrice = priceVal;
    setCart(newCart);
    setEditingPriceIndex(null);
    setCustomTotal(null);
  };

  const saveEditedSubtotal = (index: number) => {
    const subtotalVal = Number(tempSubtotal);
    if (isNaN(subtotalVal) || subtotalVal < 0) return;
    const newCart = [...cart];
    // Al cambiar el subtotal, recalculamos el precio unitario
    newCart[index].salePrice = subtotalVal / newCart[index].quantity;
    setCart(newCart);
    setEditingSubtotalIndex(null);
    setCustomTotal(null);
  };

  const saveEditedTotal = () => {
    const totalVal = Number(tempTotal);
    if (isNaN(totalVal) || totalVal < 0) return;
    setCustomTotal(totalVal);
    setIsEditingTotal(false);
  };

  const calculatedTotal = cart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
  const finalTotal = customTotal !== null ? customTotal : calculatedTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);

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

        for (const item of cart) {
          const productRef = doc(db, 'products', item.product.id);
          const productDoc = await transaction.get(productRef);
          
          if (!productDoc.exists()) {
            throw new Error(`El producto ${item.product.name} ya no existe.`);
          }

          const productData = productDoc.data() as Product;

          if (item.mode === 'pack') {
            transaction.update(productRef, { stock: (productData.stock || 0) - item.quantity });
          } else {
            transaction.update(productRef, { stockUnidades: (productData.stockUnidades || 0) - item.quantity });
          }
        }

        transaction.update(cashRegisterRef, { balance: currentBalance + finalTotal });

        const transactionRef = doc(collection(db, 'transactions'));
        const itemsSummary = cart.map(item => `${item.quantity} ${item.mode === 'pack' ? 'paq' : 'unid'}. de ${item.product.name}`).join(', ');
        
        transaction.set(transactionRef, {
          amount: finalTotal,
          date: serverTimestamp(),
          description: `Venta: ${itemsSummary}${customTotal !== null ? ' (Total ajustado manualmente)' : ''}`,
          method: 'EFECTIVO',
          type: 'Ingreso',
          userId: currentUser?.uid || 'desconocido',
          userName: userData?.name || currentUser?.email || 'Vendedor',
          items: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            salePrice: item.salePrice,
            costPrice: item.product.costPrice || 0,
            mode: item.mode
          }))
        });
      });

      alert('¡Venta realizada con éxito!');
      setCart([]);
      setCustomTotal(null);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Hubo un error al procesar la venta');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderCart = () => (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col h-[calc(100vh-8rem)] sticky top-24 shadow-md w-full">
      <h3 className="text-xl font-title text-primary border-b border-border pb-3 flex items-center gap-2">
        <ShoppingCart size={22} />
        Carrito de Ventas
      </h3>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 scrollbar-thin">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingCart size={48} className="stroke-1 mb-2 opacity-50" />
            <p className="text-sm">El carrito está vacío</p>
            <p className="text-xs mt-1">Haz clic en "Vender" o "Suelto" en un producto para agregarlo</p>
          </div>
        ) : (
          cart.map((item, index) => {
            const subtotal = item.quantity * item.salePrice;
            return (
              <div key={`${item.product.id}-${item.mode}-${index}`} className="bg-muted/50 p-3 rounded-lg border border-border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-tight">{item.product.name}</h4>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold uppercase inline-block mt-1">
                      {item.mode === 'pack' ? 'Paquete' : 'Unidad'}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-center text-sm pt-1">
                  <div className="flex items-center gap-2 border border-border rounded-md bg-background px-1.5 py-0.5">
                    <button 
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="text-muted-foreground hover:text-foreground font-bold px-1"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="text-muted-foreground hover:text-foreground font-bold px-1"
                    >
                      +
                    </button>
                  </div>

                  <div>
                    {editingPriceIndex === index ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <button 
                          onClick={() => saveEditedPrice(index)}
                          className="bg-primary text-primary-foreground p-1 rounded hover:bg-primary/95 transition-colors"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-primary text-xs">{item.salePrice.toFixed(2)} Bs c/u</span>
                        <button
                          onClick={() => { setEditingPriceIndex(index); setTempPrice(item.salePrice.toString()); }}
                          className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end items-center text-xs pt-1 border-t border-border/30 gap-2">
                  <span className="text-muted-foreground">Subtotal:</span>
                  {editingSubtotalIndex === index ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempSubtotal}
                        onChange={(e) => setTempSubtotal(e.target.value)}
                        className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                      <button 
                        onClick={() => saveEditedSubtotal(index)}
                        className="bg-primary text-primary-foreground p-1 rounded hover:bg-primary/95 transition-colors"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-bold">{subtotal.toFixed(2)} Bs</span>
                      <button
                        onClick={() => { setEditingSubtotalIndex(index); setTempSubtotal(subtotal.toString()); }}
                        className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border pt-4 space-y-4 shrink-0">
        <div className="flex justify-between items-center font-title">
          <span className="text-lg">Total:</span>
          {isEditingTotal ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempTotal}
                onChange={(e) => setTempTotal(e.target.value)}
                className="w-24 bg-background border border-border rounded px-2 py-1 text-lg font-bold text-foreground focus:outline-none focus:border-primary text-right"
              />
              <button 
                onClick={saveEditedTotal}
                className="bg-primary text-primary-foreground p-1.5 rounded hover:bg-primary/95 transition-colors"
              >
                <Check size={16} />
              </button>
              <button 
                onClick={() => setIsEditingTotal(false)}
                className="bg-muted text-foreground p-1.5 rounded hover:bg-muted/80 transition-colors border border-border"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {customTotal !== null && (
                <span className="text-sm line-through text-muted-foreground">{calculatedTotal.toFixed(2)}</span>
              )}
              <span className="text-2xl font-bold text-primary">{finalTotal.toFixed(2)} Bs</span>
              <button
                onClick={() => { setIsEditingTotal(true); setTempTotal(finalTotal.toString()); }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || checkoutLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow flex items-center justify-center gap-2"
        >
          {checkoutLoading ? 'Procesando Venta...' : 'Confirmar Venta'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-primary">Cargando inventario...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Columna Izquierda: Catálogo y Carrito en Mobile */}
      <div className="flex-1 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-title font-bold text-foreground">Productos</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <DollarSign size={16} className="text-muted-foreground" />
              Retirar ganancias
            </button>
            <button 
              onClick={() => setIsNewProductOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium shadow-md shadow-primary/20"
            >
              <Plus size={16} />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Grid En Stock */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-primary font-title tracking-wide border-b border-border pb-2">EN STOCK</h2>
          {inStockProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm italic bg-card border border-border p-4 rounded-md text-center">No hay productos en stock.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {inStockProducts.map(product => (
                <div key={product.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group relative flex flex-col">
                  <div className="aspect-square sm:aspect-video bg-muted relative flex items-center justify-center overflow-hidden border-b border-border shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={32} className="text-muted-foreground/50" />
                    )}
                    
                    <button 
                      onClick={() => setEditingProduct(product)}
                      className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-background/80 hover:bg-primary hover:text-primary-foreground backdrop-blur border border-border text-foreground p-1 sm:p-1.5 rounded-md transition-colors"
                      title="Editar Producto"
                    >
                      <Edit2 size={14} />
                    </button>

                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-background/80 backdrop-blur border border-border text-primary text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                      {product.salePrice.toFixed(2)} Bs
                    </div>
                  </div>
                  
                  <div className="p-2 sm:p-4 flex flex-col flex-1 justify-between">
                    <div className="mb-2">
                      <h3 className="font-bold text-foreground line-clamp-2 text-sm sm:text-base leading-tight">{product.name}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{product.category}</p>
                    </div>
                    
                    <div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 sm:mb-3 bg-background rounded p-1.5 sm:p-2 border border-border/50">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Stock</p>
                          <p className="text-xs sm:text-sm font-medium">
                            Paq: <span className="text-primary">{product.stock}</span>
                          </p>
                          {product.isDivisible && (
                            <p className="text-xs sm:text-sm font-medium">
                              Unid: <span className="text-primary">{product.stockUnidades}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex gap-1.5 sm:gap-2">
                          {product.stock > 0 && (
                            <button 
                              onClick={() => addToCart(product, 'pack')}
                              className="flex-1 bg-primary text-primary-foreground py-1.5 sm:py-2 rounded-md text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors"
                            >
                              <ShoppingCart size={12} className="sm:w-3.5 sm:h-3.5" />
                              Vender
                            </button>
                          )}
                          {product.isDivisible && product.stockUnidades > 0 && (
                            <button 
                              onClick={() => addToCart(product, 'unit')}
                              className="flex-1 bg-accent border border-primary/20 text-accent-foreground py-1.5 sm:py-2 rounded-md text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 hover:bg-accent/80 transition-colors"
                            >
                              <ShoppingCart size={12} className="sm:w-3.5 sm:h-3.5" />
                              Suelto
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => setPurchaseProductId(product.id)}
                          className="w-full bg-background border border-border hover:border-primary/50 text-foreground py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <Package size={12} className="text-muted-foreground" />
                          Comprar Stock
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carrito Mobile (aparece justo después de "En Stock") */}
        <div className="lg:hidden w-full mt-4">
          {renderCart()}
        </div>

        {/* Lista Sin Stock */}
        <div className="mt-4 sm:mt-8">
          <h2 className="text-xl font-semibold mb-4 text-destructive font-title tracking-wide border-b border-border pb-2">SIN STOCK</h2>
          {outOfStockProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">Todos los productos tienen stock.</p>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {outOfStockProducts.map(product => (
                  <div key={product.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted/50 transition-colors relative">
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-background border border-border flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-muted-foreground/50" />
                          )}
                        </div>
                        <button 
                          onClick={() => setEditingProduct(product)}
                          className="absolute -top-2 -left-2 bg-background border border-border hover:bg-primary hover:text-primary-foreground text-foreground p-1 rounded-full shadow-sm transition-colors"
                          title="Editar Producto"
                        >
                          <Edit2 size={10} className="sm:w-3 sm:h-3" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm sm:text-base leading-tight">{product.name}</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      <div className="text-right hidden sm:block mr-2">
                        <p className="text-sm font-bold text-muted-foreground line-through">0 en stock</p>
                      </div>
                      <button 
                        onClick={() => addToCart(product, 'pack')}
                        className="bg-primary/10 text-primary border border-primary/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                      >
                        <ShoppingCart size={12} className="sm:w-3.5 sm:h-3.5" /> Vender
                      </button>
                      {product.isDivisible && (
                        <button 
                          onClick={() => addToCart(product, 'unit')}
                          className="bg-accent/10 text-accent-foreground border border-primary/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1"
                        >
                          <ShoppingCart size={12} className="sm:w-3.5 sm:h-3.5" /> Suelto
                        </button>
                      )}
                      <button 
                        onClick={() => setPurchaseProductId(product.id)}
                        className="bg-background text-foreground border border-border px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1 sm:ml-2 w-full sm:w-auto justify-center mt-1 sm:mt-0"
                      >
                        <Package size={12} className="sm:w-3.5 sm:h-3.5" />
                        Comprar Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carrito Desktop */}
      <div className="hidden lg:block lg:w-96 shrink-0">
        {renderCart()}
      </div>

      {/* Modals */}
      {isNewProductOpen && (
        <NewProductModal 
          onClose={() => setIsNewProductOpen(false)} 
        />
      )}

      {editingProduct && (
        <EditProductModal 
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {purchaseProductId && (
        <NewPurchaseDialog 
          productId={purchaseProductId}
          onClose={() => setPurchaseProductId(null)}
          onSuccess={() => setPurchaseProductId(null)}
        />
      )}

      {isWithdrawOpen && (
        <WithdrawDialog 
          onClose={() => setIsWithdrawOpen(false)}
        />
      )}
    </div>
  );
}

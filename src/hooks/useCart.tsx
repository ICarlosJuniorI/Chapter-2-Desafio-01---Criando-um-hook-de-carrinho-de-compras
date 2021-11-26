import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart)); // Atualiza o localStorage com o carrinho atualizado
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; // Carrinho atualizado
      const productExists = updatedCart.find(product => product.id === productId); // Verifica se o produto existe
      const stock = await api.get(`/stock/${productId}`); // Chama a quantidade em estoque na API
      const stockAmount = stock.data.amount; // Pega a quantidade em estoque
      const currentAmount = productExists ? productExists.amount : 0; // Se o produto existir, a quantidade atual vai ser a que já está na api, se não será 0
      const amount = currentAmount + 1; // Quantidade será a quantidade atual + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque'); // Se a quantidade solicitada for maior que a quantidade em estoque vai dar erro
        return; // Para a execução
      }

      if (productExists) {
        productExists.amount = amount; // Se o produto existir, a quantidade do produto será atualizada
      } else {
        const product = await api.get(`/products/${productId}`); // Se o produto não existir, busca na api os dados que um produto tem e cria um novo produto com esses dados e quantidade 1

        const newProduct = {
          ...product.data,
          amount: 1
        };

        updatedCart.push(newProduct); // Adiciona o novo produto no carrinho
      }

      setCart(updatedCart); // Atualiza o setCart para o carrinho atualizado
    } catch {
      toast.error('Erro na adição do produto'); // Se o produto não existir da erro
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; // Carrinho atualizado
      const productIndex = updatedCart.findIndex(product => product.id === productId); // Encontra o produto pelo ID

      if (productIndex >= 0) { // Se o produto existir...
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) { // Se a quantidade for menor ou igual a 0 para a execução
        return;
      }

      const stock = await api.get(`/stock/${productId}`); // Busca o estoque na api
      const stockAmount = stock.data.amount; // Armazena a quantidade em estoque

      if (amount > stockAmount) { // Se a quantidade solicitada for maior que a quantidade em estoque vai dar erro
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId); // Verifica se o produto existe

      if (productExists) { // Se o produto existir...
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

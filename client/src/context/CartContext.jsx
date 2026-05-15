import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartApi } from '../api/cart'
import { useAuth } from './AuthContext'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cartApi.get()
      setItems(res.data.cartItems ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart()
    } else {
      setItems([])
    }
  }, [isAuthenticated, fetchCart])

  const addItem = useCallback(async (productId, quantity = 1) => {
    // Optimistic: if item already in cart, increment quantity immediately
    const snapshot = items
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === productId)
      if (idx >= 0) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return prev // new item — wait for server response to get product data
    })

    try {
      const res = await cartApi.add(productId, quantity)
      const cartItem = res.data.cartItem
      if (cartItem) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.productId === cartItem.productId)
          if (idx >= 0) {
            return prev.map((i) => (i.productId === cartItem.productId ? cartItem : i))
          }
          return [...prev, cartItem]
        })
      }
      return res.data
    } catch (err) {
      setItems(snapshot)
      throw err
    }
  }, [items])

  const updateItem = useCallback(async (cartItemId, quantity) => {
    const snapshot = items
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== cartItemId))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i))
      )
    }
    try {
      await cartApi.update(cartItemId, quantity)
    } catch {
      setItems(snapshot)
    }
  }, [items])

  const removeItem = useCallback(async (cartItemId) => {
    const snapshot = items
    setItems((prev) => prev.filter((i) => i.id !== cartItemId))
    try {
      await cartApi.remove(cartItemId)
    } catch {
      setItems(snapshot)
    }
  }, [items])

  const clearCart = useCallback(async () => {
    setItems([])
    try {
      await cartApi.clear()
    } catch {
      fetchCart()
    }
  }, [fetchCart])

  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)

  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.price ?? 0
    return sum + item.quantity * price
  }, 0)

  const value = {
    items,
    loading,
    itemCount,
    subtotal,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    fetchCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

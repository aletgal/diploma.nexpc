import { useState, useEffect } from 'react'
import { wishlistApi } from '../api/wishlist'
import { useAuth } from '../context/AuthContext'

export function useWishlist() {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (isAuthenticated) {
      wishlistApi
        .get()
        .then((r) => setItems(r.data.wishlistItems ?? r.data ?? []))
        .catch(() => {})
    } else {
      setItems([])
    }
  }, [isAuthenticated])

  const toggle = async (productId) => {
    const res = await wishlistApi.toggle(productId)
    if (res.data.removed) {
      setItems((prev) => prev.filter((i) => i.productId !== productId))
    } else {
      setItems((prev) => [...prev, res.data.item])
    }
    return res.data
  }

  const isWishlisted = (productId) => items.some((i) => i.productId === productId)

  return { items, toggle, isWishlisted }
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Trash2, ShoppingCart } from 'lucide-react'
import { wishlistApi } from '../api/wishlist'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatters'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

export default function WishlistPage() {
  const { addItem } = useCart()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.get().then((r) => r.data),
  })

  const items = data?.wishlistItems ?? []

  function handleRemove(productId) {
    // Optimistic: remove from cache immediately
    queryClient.setQueryData(['wishlist'], (old) => {
      if (!old) return old
      return {
        ...old,
        wishlistItems: old.wishlistItems.filter((i) => {
          const pid = i.product?.id || i.productId
          return pid !== productId
        }),
      }
    })
    // Fire and forget — invalidate to sync after
    wishlistApi.toggle(productId).catch(() => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-page py-12 text-center">
        <div className="card p-8 max-w-md mx-auto">
          <p className="text-red-500">Failed to load wishlist. Please try again.</p>
        </div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save products you love and come back to them any time."
          action={{ label: 'Browse Products', href: '/products' }}
        />
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Wishlist</h1>
      <p className="text-gray-500 text-sm mb-8">
        {items.length} item{items.length !== 1 ? 's' : ''}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const product = item.product || item
          const productId = product.id || product._id || item.productId
          const image = product.images?.[0] || product.image
          const inStock = product.stock > 0

          return (
            <div key={productId} className="card overflow-hidden group hover:border-gray-300 transition-colors">
              {/* Image */}
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                <Link to={`/products/${productId}`}>
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => handleRemove(productId)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                  title="Remove from wishlist"
                >
                  <Heart className="w-4 h-4 fill-red-400" />
                </button>
              </div>

              {/* Details */}
              <div className="p-4">
                {product.category && (
                  <span className="badge text-xs mb-2 inline-block">{product.category}</span>
                )}
                <Link to={`/products/${productId}`}>
                  <h3 className="text-gray-900 text-sm font-semibold leading-tight mb-2 hover:text-primary-600 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-primary-600 font-bold mb-1">{formatPrice(product.price)}</p>
                <p className={`text-xs mb-3 ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                  {inStock ? 'In Stock' : 'Out of Stock'}
                </p>

                <div className="flex gap-2">
                  <button
                    className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    onClick={() => addItem(productId, 1)}
                    disabled={!inStock}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                  <button
                    className="btn-ghost p-2 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => handleRemove(productId)}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

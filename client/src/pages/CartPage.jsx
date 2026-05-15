import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatters'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

export default function CartPage() {
  const { items, loading, itemCount, subtotal, updateItem, removeItem } = useCart()

  const total = subtotal

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Browse our products to find your next build."
          action={{ label: 'Continue Shopping', href: '/products' }}
        />
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
      <p className="text-gray-500 text-sm mb-8">
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.product || item
            const cartItemId = item.id
            const itemQty = item.quantity || 1
            const itemPrice = product.price || item.price || 0
            const image = product.images?.[0] || product.image

            return (
              <div key={cartItemId} className="card p-4 flex flex-col sm:flex-row gap-4">
                {/* Image */}
                <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                  {image ? (
                    <img src={image} alt={product.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ShoppingCart className="w-8 h-8 text-gray-300" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-semibold text-sm leading-tight mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.category && (
                    <span className="badge text-xs mb-2 inline-block">{product.category}</span>
                  )}
                  <p className="text-primary-600 font-semibold">{formatPrice(itemPrice)}</p>
                </div>

                {/* Qty + Remove */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-40"
                      onClick={() => updateItem(cartItemId, itemQty - 1)}
                      disabled={itemQty <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-10 text-center text-gray-900 text-sm font-medium">{itemQty}</span>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      onClick={() => updateItem(cartItemId, itemQty + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-gray-800 text-sm font-semibold">
                      {formatPrice(itemPrice * itemQty)}
                    </p>
                    <button
                      onClick={() => removeItem(cartItemId)}
                      className="text-gray-400 hover:text-red-500 transition-colors mt-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary */}
        <div>
          <div className="card p-6 sticky top-24">
            <h2 className="text-gray-900 font-bold text-lg mb-5">Order Summary</h2>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600 text-lg">{formatPrice(total)}</span>
              </div>
            </div>

            <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2 py-3 mb-3">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/products" className="btn-secondary w-full flex items-center justify-center py-2.5 text-sm">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

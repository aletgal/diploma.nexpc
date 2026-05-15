import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Monitor, Heart, ShoppingCart, Check, Minus, Plus, GitCompare, Star } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../hooks/useWishlist'
import { formatPrice, formatCategory } from '../../utils/formatters'
import { reviewsApi } from '../../api/reviews'

const CATEGORY_BADGE_CLS = {
  READY_PC:  'badge-blue',
  COMPONENT: 'badge-yellow',
}

function extractGpuChip(str) {
  if (!str) return str
  const m = str.match(/(?:RTX|GTX|RX)\s+\d+(?:\s+(?:XT|XTX|Ti|Super))?\s*(?:\d+\s*GB)?/i)
  return m ? m[0].replace(/\s+/g, ' ').trim() : str
}

function getCompareList() {
  try { return JSON.parse(localStorage.getItem('compareList') || '[]') } catch { return [] }
}

function setCompareList(list) {
  localStorage.setItem('compareList', JSON.stringify(list))
  window.dispatchEvent(new Event('compareListChanged'))
}

export default function ProductCard({ product }) {
  const { addItem, items, updateItem, removeItem } = useCart()
  const { toggle, isWishlisted } = useWishlist()
  const [added, setAdded] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [inCompare, setInCompare] = useState(() => getCompareList().includes(product.id))

  const { data: ratingData } = useQuery({
    queryKey: ['rating', product.id],
    queryFn: () => reviewsApi.getProductRating(product.id).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })

  const wishlisted = isWishlisted(product.id)
  const cartItem = items.find((i) => i.productId === product.id)
  const category = { label: formatCategory(product.category), cls: CATEGORY_BADGE_CLS[product.category] ?? '' }
  const inStock = product.stock > 0
  const imageUrl = product.images?.[0]

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await addItem(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {}
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (wishlistLoading) return
    setWishlistLoading(true)
    try { await toggle(product.id) } finally { setWishlistLoading(false) }
  }

  const handleCompare = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const list = getCompareList()
    if (list.includes(product.id)) {
      setCompareList(list.filter((id) => id !== product.id))
      setInCompare(false)
    } else if (list.length < 3) {
      setCompareList([...list, product.id])
      setInCompare(true)
    }
  }

  const hasRating = ratingData && ratingData.count > 0

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="card overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="relative bg-[#f8fafc] overflow-hidden" style={{ aspectRatio: '1/1', borderRadius: '12px 12px 0 0' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16 }} />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Monitor className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          {/* Compare button */}
          <button
            onClick={handleCompare}
            aria-label="Compare"
            className={`absolute top-2 left-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm transition-colors shadow-sm ${inCompare ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}
          >
            <GitCompare className="w-4 h-4" />
          </button>

          {/* Category badge */}
          <div className="absolute top-2 left-2">
            <span className={`badge ${category.cls}`}>{category.label}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {hasRating && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-3 h-3 ${s <= Math.round(ratingData.average) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-xs text-gray-400 ml-0.5">({ratingData.count})</span>
            </div>
          )}

          <p className="text-lg font-bold text-primary-600 mt-auto">
            {formatPrice(product.price)}
          </p>

          <div className="min-h-[30px]">
            {product.specs?.CPU && <p className="text-xs text-gray-400 truncate">{product.specs.CPU}</p>}
            {product.specs?.GPU && <p className="text-xs text-gray-400 truncate">{extractGpuChip(product.specs.GPU)}</p>}
            {!product.specs?.CPU && !product.specs?.GPU && (
              <p className={`text-xs font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </p>
            )}
          </div>

          {cartItem ? (
            <div className="flex items-center justify-between mt-2 border border-primary-200 rounded-lg overflow-hidden">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (cartItem.quantity <= 1) removeItem(cartItem.id); else updateItem(cartItem.id, cartItem.quantity - 1) }}
                className="flex-1 py-2 flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 text-sm font-semibold text-gray-900">{cartItem.quantity}</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateItem(cartItem.id, cartItem.quantity + 1) }}
                className="flex-1 py-2 flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!inStock || added}
              className={`btn-primary w-full mt-2 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all ${added ? 'bg-green-600 hover:bg-green-600' : ''}`}
            >
              {added ? <><Check className="w-4 h-4" />Added</> : <><ShoppingCart className="w-4 h-4" />Add to Cart</>}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

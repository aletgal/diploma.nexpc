import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Monitor, Heart, ShoppingCart, ChevronLeft, Minus, Plus,
  Shield, Truck, Wrench, Star, Gamepad2, Radio, Film, Box, Code, CheckCircle, Zap,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../hooks/useWishlist'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatCategory } from '../utils/formatters'
import { productsApi } from '../api/products'
import { reviewsApi } from '../api/reviews'
import api from '../api/client'
import Spinner from '../components/ui/Spinner'

// ─── Star components ──────────────────────────────────────────────────────────
function StarRating({ rating, onRate, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const sz = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sz} cursor-pointer transition-colors ${
            star <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => onRate && onRate(star)}
          onMouseEnter={() => onRate && setHover(star)}
          onMouseLeave={() => onRate && setHover(0)}
        />
      ))}
    </div>
  )
}

function StarDisplay({ rating, size = 'sm' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${sz} ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

// ─── Rating summary ───────────────────────────────────────────────────────────
function RatingSummary({ productId }) {
  const { data } = useQuery({
    queryKey: ['rating', productId],
    queryFn: () => reviewsApi.getProductRating(productId).then((r) => r.data),
  })

  if (!data || data.count === 0) return null

  return (
    <div className="flex items-start gap-8 p-5 bg-gray-50 rounded-xl mb-6">
      <div className="text-center flex-shrink-0">
        <p className="text-5xl font-extrabold text-gray-900">{data.average.toFixed(1)}</p>
        <StarDisplay rating={data.average} size="lg" />
        <p className="text-gray-400 text-xs mt-1">{data.count} reviews</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = data.distribution[star] || 0
          const pct = data.count > 0 ? (count / data.count) * 100 : 0
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-5">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Review form ──────────────────────────────────────────────────────────────
function ReviewForm({ productId, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data) => reviewsApi.createReview(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      queryClient.invalidateQueries({ queryKey: ['rating', productId] })
      onSuccess()
    },
    onError: (err) => setError(err?.response?.data?.error || 'Failed to submit review'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!rating) { setError('Please select a star rating'); return }
    mutation.mutate({ rating, title, comment })
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-6">
      <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
      <div className="mb-4">
        <label className="text-sm text-gray-600 mb-2 block">Your Rating</label>
        <StarRating rating={rating} onRate={setRating} size="lg" />
        {!rating && <p className="text-xs text-gray-400 mt-1">Click a star to rate</p>}
      </div>
      <div className="mb-3">
        <label className="text-sm text-gray-600 mb-1 block">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" placeholder="Summary of your review" required />
      </div>
      <div className="mb-4">
        <label className="text-sm text-gray-600 mb-1 block">Comment</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="input w-full min-h-[100px] resize-y" placeholder="Share your experience..." required />
      </div>
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <button type="submit" disabled={mutation.isPending} className="btn-primary">
        {mutation.isPending ? <Spinner size="sm" /> : 'Submit Review'}
      </button>
    </form>
  )
}

// ─── Reviews list ─────────────────────────────────────────────────────────────
function ReviewsList({ productId }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: () => reviewsApi.getProductReviews(productId, { page, limit: 5 }).then((r) => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>

  const reviews = data?.reviews || []
  const totalPages = data?.pages || 1

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Star className="w-10 h-10 mx-auto mb-2 text-gray-200" />
        <p className="font-medium">No reviews yet. Be the first to review this product!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {reviews.map((review) => {
          const firstName = review.user?.name?.split(' ')[0] || 'User'
          const lastInitial = review.user?.name?.split(' ')[1]?.[0] || ''
          const displayName = lastInitial ? `${firstName} ${lastInitial}.` : firstName
          return (
            <div key={review.id} className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <StarDisplay rating={review.rating} />
                <span className="text-xs text-gray-400">{displayName}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{review.title}</p>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </div>
          )
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Reviews section ──────────────────────────────────────────────────────────
function ReviewsSection({ productId }) {
  const { isAuthenticated } = useAuth()
  const [showForm, setShowForm] = useState(false)

  const canReview = isAuthenticated

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
        {canReview && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">
            Write a Review
          </button>
        )}
      </div>

      <RatingSummary productId={productId} />

      {showForm && (
        <ReviewForm productId={productId} onSuccess={() => setShowForm(false)} />
      )}

      <ReviewsList productId={productId} />
    </div>
  )
}

// ─── Benchmark section ────────────────────────────────────────────────────────
function BenchmarkSection({ product }) {
  const [benchData, setBenchData] = useState(null)
  const [loading, setLoading] = useState(true)
  const cacheKey = `benchmark-${product.id}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setBenchData(JSON.parse(cached)); setLoading(false); return } catch {}
    }
    api.post('/ai/benchmark', { productName: product.name, specs: product.specs })
      .then((r) => r.data)
      .then((d) => {
        if (d.games) {
          sessionStorage.setItem(cacheKey, JSON.stringify(d))
          setBenchData(d)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [product.id])

  if (!loading && !benchData) return null

  function getFpsColor(fps) {
    if (fps > 144) return '#16a34a'
    if (fps >= 60) return '#2563eb'
    if (fps >= 30) return '#ca8a04'
    return '#dc2626'
  }

  const tierColors = { Enthusiast: '#7c3aed', 'High-end': '#2563eb', 'Mid-range': '#16a34a', Budget: '#d97706' }
  const tierColor = benchData ? (tierColors[benchData.overallRating] || '#6b7280') : '#6b7280'

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap style={{ width: 20, height: 20, color: '#2563eb' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>AI Performance Prediction</h2>
        </div>
        {benchData?.overallRating && (
          <span style={{ background: tierColor, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 9999 }}>
            {benchData.overallRating}
          </span>
        )}
      </div>
      {loading ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                  <td style={{ padding: '14px 20px' }}><div style={{ height: 14, background: '#e5e7eb', borderRadius: 6, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} /></td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}><div style={{ height: 14, background: '#e5e7eb', borderRadius: 6, width: 40, margin: 'auto' }} /></td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}><div style={{ height: 14, background: '#e5e7eb', borderRadius: 6, width: 40, margin: 'auto' }} /></td>
                  <td style={{ padding: '14px 20px' }}><div style={{ height: 14, background: '#e5e7eb', borderRadius: 6, width: 60, marginLeft: 'auto' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Game</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Resolution</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Quality</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Avg FPS</th>
                </tr>
              </thead>
              <tbody>
                {(benchData?.games || []).map((game, i) => (
                  <tr key={game.name} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: '#111827', fontWeight: 500 }}>{game.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>1080p</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>{game.quality}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: getFpsColor(game.fps), minWidth: 52, textAlign: 'right' }}>
                          {game.fps} FPS
                        </span>
                        <div style={{ width: 56, height: 5, background: '#f3f4f6', borderRadius: 9999, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (game.fps / 240) * 100)}%`, background: getFpsColor(game.fps), borderRadius: 9999 }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {benchData?.bottleneck && benchData.bottleneck !== 'None' && (
              <div style={{ padding: '10px 20px', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
                ⚡ {benchData.bottleneck}
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, fontStyle: 'italic' }}>
            * AI predictions based on typical hardware performance. Actual results may vary.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Use cases section ────────────────────────────────────────────────────────
const USE_CASE_ICONS = { gamepad: Gamepad2, radio: Radio, film: Film, monitor: Monitor, code: Code, box: Box }

function UseCasesSection({ product }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const cacheKey = `usecases-${product.id}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setData(JSON.parse(cached)); setLoading(false); return } catch {}
    }
    api.post('/ai/generate-use-cases', { productName: product.name, specs: product.specs })
      .then((r) => r.data)
      .then((d) => {
        if (d.useCases?.length) {
          sessionStorage.setItem(cacheKey, JSON.stringify(d))
          setData(d)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [product.id])

  if (!loading && !data) return null

  return (
    <div className="mt-10">
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Who Is This For</h2>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size="sm" />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Analyzing use cases...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {(data?.useCases || []).map((uc) => {
            const IconComp = USE_CASE_ICONS[uc.icon] || Box
            return (
              <div key={uc.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 18px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, minWidth: 110, textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComp style={{ width: 20, height: 20, color: '#2563eb' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{uc.label}</p>
                {uc.description && (
                  <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{uc.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Similar builds section ───────────────────────────────────────────────────
function SimilarBuildsSection({ productId, category }) {
  const { data } = useQuery({
    queryKey: ['similar-products', productId],
    queryFn: () => productsApi.getAll({ category, limit: 5, exclude: productId }).then((r) => r.data),
    enabled: !!productId,
  })

  const products = (data?.products || []).filter((p) => p.id !== productId).slice(0, 4)
  if (products.length === 0) return null

  return (
    <div className="mt-10">
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Similar Builds</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {products.map((prod) => (
          <Link key={prod.id} to={`/products/${prod.id}`}
            style={{ display: 'block', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16, textDecoration: 'none', transition: 'box-shadow 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, height: 100 }}>
              {prod.images?.[0] ? (
                <img src={prod.images[0]} alt={prod.name} style={{ height: '100%', objectFit: 'contain' }} />
              ) : (
                <Monitor style={{ width: 48, height: 48, color: '#e5e7eb', marginTop: 24 }} />
              )}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>{prod.name}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', margin: 0 }}>{formatPrice(prod.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Main product detail page ─────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams()
  const { addItem, loading: cartLoading } = useCart()
  const { toggle, isWishlisted } = useWishlist()
  const [selectedImage, setSelectedImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [addedMsg, setAddedMsg] = useState(false)

  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id).then((r) => r.data),
    enabled: !!id,
  })

  const { data: ratingData } = useQuery({
    queryKey: ['rating', id],
    queryFn: () => reviewsApi.getProductRating(id).then((r) => r.data),
    enabled: !!id,
  })

  const product = productData?.product ?? null
  const linkedComponents = productData?.linkedComponents ?? []

  const componentBySpecKey = {}
  linkedComponents.forEach(({ specKey, component }) => {
    componentBySpecKey[specKey] = component
  })

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  }

  if (error || !product) {
    return (
      <div className="container-page py-20 text-center">
        <div className="card p-10 max-w-md mx-auto">
          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-gray-900 text-xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">This product doesn't exist or has been removed.</p>
          <Link to="/products" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    )
  }

  const images = product.images || (product.image ? [product.image] : [])
  const inStock = product.stock > 0
  const maxQty = Math.min(product.stock || 99, 99)
  const wishlisted = isWishlisted(product._id || product.id)
  const isReadyPC = product.category === 'READY_PC'

  async function handleAddToCart() {
    await addItem(product._id || product.id, qty)
    setAddedMsg(true)
    setTimeout(() => setAddedMsg(false), 2000)
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{ maxWidth: 1200 }}>
      <Link to="/products" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
        {/* Left: image card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            {images.length > 0 ? (
              <img src={images[selectedImage]} alt={product.name} className="max-h-[500px] w-full object-contain" />
            ) : (
              <div className="flex items-center justify-center w-full h-64">
                <Monitor className="w-24 h-24 text-gray-200" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pt-5 mt-2 border-t border-gray-100">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary-500' : 'border-gray-200 hover:border-gray-400'}`}>
                  <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="flex flex-col gap-5">
          {product.category && (
            <span className="badge badge-blue w-fit">{formatCategory(product.category)}</span>
          )}

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1.2, margin: 0 }}>
            {product.name}
          </h1>

          {ratingData && ratingData.count > 0 && (
            <div className="flex items-center gap-2">
              <StarDisplay rating={ratingData.average} size="lg" />
              <span className="text-sm text-gray-500">{ratingData.average.toFixed(1)} ({ratingData.count} reviews)</span>
            </div>
          )}

          <div style={{ fontSize: 36, fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>
            {formatPrice(product.price)}
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
              {inStock ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </span>
          </div>

          {product.description && (
            <div style={{ borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', padding: '16px 0' }}>
              <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, margin: 0 }}>{product.description}</p>
            </div>
          )}

          {inStock && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-gray-900 font-medium text-sm select-none">{qty}</span>
                <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button className="btn-primary w-full justify-center text-base gap-2" style={{ height: 52 }} onClick={handleAddToCart} disabled={!inStock || cartLoading}>
              <ShoppingCart className="w-5 h-5" />
              {addedMsg ? 'Added to Cart!' : inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button className={`btn-secondary w-full justify-center gap-2 ${wishlisted ? 'border-red-300 text-red-500 hover:bg-red-50' : ''}`} onClick={() => toggle(product._id || product.id)}>
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-400 text-red-400' : ''}`} />
              {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Trust block — READY_PC only */}
      {isReadyPC && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { icon: Shield, title: '2 Year Warranty', desc: 'Full hardware coverage on all components' },
            { icon: Wrench, title: 'Pro Assembly', desc: 'Built and tested by certified technicians' },
            { icon: Truck, title: 'Free Delivery', desc: 'Nationwide shipping, fully insured' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '18px 12px', background: '#f9fafb', borderRadius: 14, border: '1px solid #f3f4f6' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon style={{ width: 20, height: 20, color: '#6b7280' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{title}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Specifications */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <div className="mb-10">
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Specifications</h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <tbody>
                {Object.entries(product.specs).map(([key, value], i) => {
                  const linkedComp = componentBySpecKey[key]
                  return (
                    <tr key={key} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ width: 200, padding: '12px 20px', color: '#6b7280', fontWeight: 500, fontSize: 14, borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '12px 20px', color: '#111827', fontSize: 14 }}>
                        {linkedComp ? (
                          <Link to={`/components/${linkedComp.id}`} className="text-primary-600 hover:underline font-medium">
                            {String(value)}
                          </Link>
                        ) : (
                          String(value)
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI sections — READY_PC only */}
      {isReadyPC && (
        <>
          <BenchmarkSection product={product} />
          <UseCasesSection product={product} />
          <SimilarBuildsSection productId={product.id} category={product.category} />
        </>
      )}

      {/* Reviews */}
      <ReviewsSection productId={product.id} />
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ShoppingCart, Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick, CreditCard, Smartphone, Tag, X } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { ordersApi } from '../api/orders'
import { paymentApi } from '../api/payment'
import { promoApi } from '../api/promo'
import { formatPrice } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51TX2dvRyeWyeYBfSO2ow2loqyyLXphWKOU3B7GIv4PTCY3JmRlnGUCESbkP4GBlN3yk36dyhsAXues2LUSE9ynq900oiW0aFnH'
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

const KZ_CITIES = [
  'Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe',
  'Taraz', 'Pavlodar', 'Oskemen', 'Semey', 'Atyrau',
]

const SLOT_ICONS = {
  CPU: Cpu, GPU: Monitor, RAM: MemoryStick, STORAGE: HardDrive,
  MOTHERBOARD: CircuitBoard, PSU: Zap, CASE: Box, COOLING: Wind, FAN: Wind,
}

function AddressForm({ user, onAddressChange }) {
  const fullNameRef = useRef(null)
  const emailRef = useRef(null)
  const streetRef = useRef(null)
  const zipRef = useRef(null)
  const [city, setCity] = useState('Almaty')
  const [errors, setErrors] = useState({})

  function getAddress() {
    return {
      fullName: fullNameRef.current?.value?.trim() || '',
      email: emailRef.current?.value?.trim() || '',
      street: streetRef.current?.value?.trim() || '',
      city,
      zip: zipRef.current?.value?.trim() || '',
      country: 'Kazakhstan',
    }
  }

  function validate(addr) {
    const errs = {}
    if (!addr.fullName) errs.fullName = 'Full name is required'
    if (!addr.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(addr.email)) errs.email = 'Invalid email'
    if (!addr.street) errs.street = 'Street address is required'
    if (!addr.zip) errs.zip = 'Postal code is required'
    return errs
  }

  useEffect(() => {
    onAddressChange({ getAddress, validate: () => validate(getAddress()), setErrors })
  }, [city])

  return (
    <div className="card p-6">
      <h2 className="text-gray-900 font-bold mb-5">Delivery Address</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="label">Full Name</label>
          <input ref={fullNameRef} id="fullName" type="text" defaultValue={user?.name || ''} className={`input w-full ${errors.fullName ? 'border-red-400' : ''}`} placeholder="Aibek Dzhaksybekov" onChange={() => errors.fullName && setErrors((p) => ({ ...p, fullName: undefined }))} />
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input ref={emailRef} id="email" type="email" defaultValue={user?.email || ''} className={`input w-full ${errors.email ? 'border-red-400' : ''}`} placeholder="aibek@example.kz" onChange={() => errors.email && setErrors((p) => ({ ...p, email: undefined }))} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="street" className="label">Street Address</label>
          <input ref={streetRef} id="street" type="text" className={`input w-full ${errors.street ? 'border-red-400' : ''}`} placeholder="ul. Abaya 150, apt. 12" onChange={() => errors.street && setErrors((p) => ({ ...p, street: undefined }))} />
          {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="city" className="label">City</label>
            <select id="city" className="input w-full" value={city} onChange={(e) => setCity(e.target.value)}>
              {KZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="zip" className="label">Postal Code</label>
            <input
              ref={zipRef} id="zip" type="text" inputMode="numeric" maxLength={6}
              className={`input w-full ${errors.zip ? 'border-red-400' : ''}`} placeholder="050000"
              onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); if (errors.zip) setErrors((p) => ({ ...p, zip: undefined })) }}
            />
            {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
          </div>
        </div>
        <div>
          <label className="label">Country</label>
          <input type="text" className="input w-full opacity-60 cursor-not-allowed" value="Kazakhstan" disabled />
        </div>
      </div>
    </div>
  )
}

// --- Stripe Card Payment ---
function StripePaymentForm({ total, address, customBuild, isCustomBuild, promoCode, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const { clearCart } = useCart()
  const [submitting, setSubmitting] = useState(false)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    const addrErrors = address.validate()
    if (Object.keys(addrErrors).length > 0) {
      address.setErrors(addrErrors)
      return
    }

    setSubmitting(true)
    onError('')
    try {
      const addr = address.getAddress()

      const intentRes = await paymentApi.createIntent(total)
      const { clientSecret } = intentRes.data
      console.log('[Checkout] PaymentIntent created, confirming with Stripe...')

      const stripeResult = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: addr.fullName, email: addr.email },
        },
      })
      console.log('[Checkout] confirmCardPayment result:', stripeResult)

      const { error: stripeError, paymentIntent } = stripeResult

      if (stripeError) {
        throw new Error(stripeError.message)
      }
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment incomplete. Status: ${paymentIntent?.status ?? 'unknown'}`)
      }

      console.log('[Checkout] Stripe confirmed, creating order...')
      let res
      if (isCustomBuild) {
        res = await ordersApi.createCustom(addr, customBuild, { paymentStatus: 'PAID', paymentMethod: 'STRIPE', paymentIntentId: paymentIntent.id, promoCode })
        localStorage.removeItem('checkoutBuild')
      } else {
        res = await ordersApi.create(addr, { paymentStatus: 'PAID', paymentMethod: 'STRIPE', paymentIntentId: paymentIntent.id, promoCode })
        clearCart()
      }

      console.log('[Checkout] Order API response:', res)
      const order = res.data?.order ?? res.data ?? res
      console.log('[Checkout] Extracted order:', order, '| id:', order?.id || order?._id)

      onSuccess(order.id || order._id)
    } catch (err) {
      console.error('[Checkout] Error in handlePay:', err)
      onError(err?.response?.data?.error || err.message || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <p className="text-gray-400 text-xs">
        Test card: <span className="font-mono">4242 4242 4242 4242</span> · Any future date · Any CVC
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <svg width="40" height="16" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Powered by Stripe">
          <text x="0" y="18" fontFamily="sans-serif" fontSize="13" fill="#6b7280">Powered by</text>
          <text x="72" y="18" fontFamily="sans-serif" fontSize="14" fontWeight="bold" fill="#635bff">Stripe</text>
        </svg>
      </div>
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-60"
      >
        {submitting ? <><Spinner size="sm" /> Processing payment...</> : <><CreditCard className="w-5 h-5" /> Pay {formatPrice(total)}</>}
      </button>
    </form>
  )
}

// --- Kaspi Simulation ---
function KaspiPaymentForm({ total, address, customBuild, isCustomBuild, promoCode, onSuccess, onError }) {
  const { clearCart } = useCart()
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState('phone') // phone | waiting | done
  const [submitting, setSubmitting] = useState(false)

  function formatPhone(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 1) return digits
    if (digits.length <= 4) return `+7 ${digits.slice(1)}`
    if (digits.length <= 7) return `+7 ${digits.slice(1, 4)} ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }

  async function handleSend(e) {
    e.preventDefault()
    const addrErrors = address.validate()
    if (Object.keys(addrErrors).length > 0) {
      address.setErrors(addrErrors)
      return
    }
    if (phone.replace(/\D/g, '').length < 11) {
      onError('Enter a valid Kazakhstan phone number.')
      return
    }
    onError('')
    setStage('waiting')

    // Simulate Kaspi confirmation after 3s
    setTimeout(async () => {
      setStage('done')
      setSubmitting(true)
      try {
        const addr = address.getAddress()
        let res
        if (isCustomBuild) {
          res = await ordersApi.createCustom(addr, customBuild, { paymentStatus: 'PAID', paymentMethod: 'KASPI_DEMO', promoCode })
          localStorage.removeItem('checkoutBuild')
        } else {
          res = await ordersApi.create(addr, { paymentStatus: 'PAID', paymentMethod: 'KASPI_DEMO', promoCode })
          clearCart()
        }
        const order = res.data?.order ?? res.data ?? res
        onSuccess(order.id || order._id)
      } catch (err) {
        onError(err?.response?.data?.error || err.message || 'Order creation failed.')
        setStage('phone')
      } finally {
        setSubmitting(false)
      }
    }, 3000)
  }

  if (stage === 'waiting') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: '#E8003D', borderTopColor: 'transparent' }} />
        </div>
        <p className="font-semibold text-gray-800">Waiting for confirmation in Kaspi app...</p>
        <p className="text-gray-500 text-sm">Check your phone <span className="font-mono font-medium">{phone}</span></p>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: '#e6f9ed' }}>
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="font-semibold text-green-700 text-lg">Payment confirmed!</p>
        {submitting && <p className="text-gray-400 text-sm">Creating your order...</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <div>
        <label className="label">Kaspi Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className="input w-full text-lg font-mono"
          placeholder="+7 777 777 77 77"
        />
      </div>
      <p className="text-gray-400 text-xs">(Demo mode — no real transaction)</p>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl text-white disabled:opacity-60 transition-colors"
        style={{ background: '#E8003D' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#c0002e'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#E8003D'}
      >
        <Smartphone className="w-5 h-5" />
        Pay via Kaspi — {formatPrice(total)}
      </button>
    </form>
  )
}

function PromoCodeField({ baseTotal, onApply }) {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApply() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await promoApi.validate(code.trim(), baseTotal)
      setApplied({ ...res.data, code: code.trim().toUpperCase() })
      onApply({ ...res.data, code: code.trim().toUpperCase() })
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid promo code')
      setApplied(null)
      onApply(null)
    } finally {
      setLoading(false)
    }
  }

  function handleRemove() {
    setApplied(null)
    setCode('')
    setError('')
    onApply(null)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-4 h-4 text-gray-400" />
        <h2 className="text-gray-900 font-bold">Promo Code</h2>
      </div>
      {applied ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div>
            <p className="text-green-700 font-semibold text-sm">{applied.discount}% discount applied!</p>
            <p className="text-green-600 text-xs">You save {formatPrice(applied.discountAmount)}</p>
          </div>
          <button onClick={handleRemove} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Enter promo code"
            className="input flex-1"
          />
          <button
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="btn-primary px-4 disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" /> : 'Apply'}
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, loading: cartLoading } = useCart()
  const { user } = useAuth()

  const [customBuild] = useState(() => {
    try {
      const raw = localStorage.getItem('checkoutBuild')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const [paymentTab, setPaymentTab] = useState('stripe') // stripe | kaspi
  const [submitError, setSubmitError] = useState('')
  const [expandedSpecs, setExpandedSpecs] = useState({})
  const [promoData, setPromoData] = useState(null)
  const addressRef = useRef(null)

  const isCustomBuild = !!customBuild
  const baseTotal = isCustomBuild ? customBuild.totalPrice : subtotal
  const total = promoData ? promoData.finalTotal : baseTotal

  useEffect(() => {
    if (!isCustomBuild && !cartLoading && (!items || items.length === 0)) {
      navigate('/cart', { replace: true })
    }
  }, [items, cartLoading, navigate, isCustomBuild])

  function handleSuccess(orderId) {
    navigate(`/orders?newOrder=${orderId}`, { replace: true })
  }

  if (!isCustomBuild && cartLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  }

  const summaryItems = isCustomBuild
    ? Object.entries(customBuild.components || {}).filter(([, c]) => c).map(([slot, comp]) => ({
        key: slot, name: comp.name, price: comp.price || 0, qty: comp.quantity || 1, imageUrl: comp.imageUrl,
      }))
    : (items || []).map((item) => {
        const product = item.product || item
        return {
          key: item.productId || product.id,
          name: product.name, price: product.price || item.price || 0,
          qty: item.quantity || 1, imageUrl: product.images?.[0] || product.image,
          specs: product.specs || null,
        }
      })

  const sharedPaymentProps = {
    total,
    address: addressRef.current || { getAddress: () => ({}), validate: () => ({}), setErrors: () => {} },
    customBuild,
    isCustomBuild,
    promoCode: promoData ? promoData.code : undefined,
    onSuccess: handleSuccess,
    onError: setSubmitError,
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: address + payment */}
        <div className="lg:col-span-2 space-y-5">
          <AddressForm
            user={user}
            onAddressChange={(ref) => { addressRef.current = ref }}
          />

          <PromoCodeField baseTotal={baseTotal} onApply={setPromoData} />

          {/* Payment tabs */}
          <div className="card p-6">
            <h2 className="text-gray-900 font-bold mb-5">Payment Method</h2>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPaymentTab('stripe')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${paymentTab === 'stripe' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                <CreditCard className="w-4 h-4" />
                Pay by Card
              </button>
              <button
                onClick={() => setPaymentTab('kaspi')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${paymentTab === 'kaspi' ? 'border-[#E8003D] text-[#E8003D]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                style={paymentTab === 'kaspi' ? { background: '#fef0f3' } : {}}
              >
                <Smartphone className="w-4 h-4" />
                Kaspi Pay
              </button>
            </div>

            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{submitError}</p>
              </div>
            )}

            {paymentTab === 'stripe' ? (
              <Elements stripe={stripePromise}>
                <StripePaymentForm {...sharedPaymentProps} />
              </Elements>
            ) : (
              <KaspiPaymentForm {...sharedPaymentProps} />
            )}
          </div>
        </div>

        {/* Right: order summary */}
        <div>
          <div className="card p-6 sticky top-24">
            <h2 className="text-gray-900 font-bold mb-4">Order Summary</h2>

            {isCustomBuild && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: '#dbeafe', color: '#1d4ed8' }}>Custom Build</span>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customBuild.name}</span>
              </div>
            )}

            <div className="space-y-3 mb-5">
              {summaryItems.map((item, i) => {
                const Icon = isCustomBuild ? (SLOT_ICONS[item.key] || ShoppingCart) : null
                return (
                  <div key={item.key || i} className="flex gap-3">
                    <div className="w-12 h-12 rounded-md bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                      ) : Icon ? (
                        <Icon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-xs font-medium leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-gray-400 text-xs">Qty: {item.qty}</p>
                      {!isCustomBuild && item.specs && Object.keys(item.specs).length > 0 && (
                        <div>
                          <button type="button" onClick={() => setExpandedSpecs((p) => ({ ...p, [item.key]: !p[item.key] }))} className="text-primary-500 text-xs mt-0.5 hover:underline">
                            {expandedSpecs[item.key] ? 'Hide specs' : 'View specs'}
                          </button>
                          {expandedSpecs[item.key] && (
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(item.specs).map(([k, v]) => (
                                <p key={k} className="text-gray-400 text-xs leading-tight"><span className="text-gray-500 font-medium">{k}:</span> {v}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-800 text-sm font-medium flex-shrink-0">{formatPrice(item.price * item.qty)}</p>
                  </div>
                )
              })}
            </div>

            <div className="divider mb-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">{formatPrice(baseTotal)}</span>
              </div>
              {promoData && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({promoData.discount}%)</span>
                  <span>-{formatPrice(promoData.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600 text-base">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

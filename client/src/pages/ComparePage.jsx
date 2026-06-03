import React, { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ShoppingCart, GitCompare, Star } from 'lucide-react'
import { productsApi } from '../api/products'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'

const SPEC_KEYS = ['CPU', 'GPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case']
const SPEC_LABELS = { CPU: 'CPU', GPU: 'GPU', RAM: 'RAM', Storage: 'Storage', Motherboard: 'Motherboard', PSU: 'PSU', Case: 'Case' }

function parseNum(val) {
  if (!val) return null
  const m = String(val).match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

function getBestWorst(products, key) {
  if (products.length < 2) return {}
  if (key === 'price') {
    const prices = products.map((p) => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const result = {}
    products.forEach((p, i) => {
      if (p.price === min) result[i] = 'best'
      else if (p.price === max) result[i] = 'worst'
    })
    return result
  }
  const nums = products.map((p) => {
    const val = p.specs?.[key]
    return parseNum(val)
  })
  if (nums.every((n) => n === null)) return {}
  const validNums = nums.filter((n) => n !== null)
  if (validNums.length < 2) return {}
  const allSame = validNums.every((n) => n === validNums[0])
  if (allSame) return {}
  const max = Math.max(...validNums)
  const min = Math.min(...validNums)
  const result = {}
  nums.forEach((n, i) => {
    if (n === max) result[i] = 'best'
    else if (n === min) result[i] = 'worst'
  })
  return result
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 3)

  const queries = ids.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['product', id],
      queryFn: () => productsApi.getOne(id).then((r) => r.data?.product ?? r.data),
      enabled: !!id,
    })
  )

  const { addItem } = useCart()
  const loading = queries.some((q) => q.isLoading)
  const products = queries.map((q) => q.data).filter(Boolean)

  function clearComparison() {
    localStorage.removeItem('compareList')
    setSearchParams({})
  }

  if (ids.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No products to compare</h2>
        <p className="text-gray-500 mb-6">Add products to compare from the products page.</p>
        <Link to="/products" className="btn-primary">Browse Products</Link>
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  }

  const priceBestWorst = getBestWorst(products, 'price')
  const specBestWorst = {}
  SPEC_KEYS.forEach((key) => {
    specBestWorst[key] = getBestWorst(products, key)
  })

  const colWidth = products.length === 2 ? 'w-1/2' : 'w-1/3'

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/products" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Compare Products</h1>
        </div>
        <button onClick={clearComparison} className="btn-secondary text-sm">
          Clear comparison
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-xl overflow-hidden text-sm">
          {/* Header */}
          <thead>
            <tr>
              <th className="bg-gray-50 border-b border-gray-200 px-4 py-4 text-left text-gray-500 font-medium w-36">
                Specification
              </th>
              {products.map((p) => (
                <th key={p.id} className={`bg-gray-50 border-b border-gray-200 px-4 py-4 text-center ${colWidth}`}>
                  {p.images?.[0] && (
                    <div className="flex justify-center mb-2">
                      <img src={p.images[0]} alt={p.name} className="w-20 h-20 object-contain" />
                    </div>
                  )}
                  <Link to={`/products/${p.id}`} className="text-gray-900 font-semibold hover:text-primary-600 line-clamp-2 text-sm leading-tight block mb-2">
                    {p.name}
                  </Link>
                  <button
                    onClick={() => addItem(p.id, 1)}
                    disabled={p.stock === 0}
                    className="btn-primary text-xs py-1.5 px-3 mx-auto flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price row */}
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 whitespace-nowrap">Price</td>
              {products.map((p, i) => {
                const highlight = priceBestWorst[i]
                return (
                  <td key={p.id} className={`px-4 py-3 text-center font-bold text-base ${
                    highlight === 'best' ? 'bg-green-50 text-green-700' : highlight === 'worst' ? 'bg-red-50 text-red-700' : 'text-gray-900'
                  }`}>
                    {formatPrice(p.price)}
                    {highlight === 'best' && <span className="block text-xs font-normal text-green-600">Best price</span>}
                  </td>
                )
              })}
            </tr>

            {/* Stock row */}
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 whitespace-nowrap">Stock</td>
              {products.map((p) => (
                <td key={p.id} className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Spec rows */}
            {SPEC_KEYS.map((key, rowIdx) => {
              const bw = specBestWorst[key]
              const hasAny = products.some((p) => p.specs?.[key])
              if (!hasAny) return null
              return (
                <tr key={key} className={`border-b border-gray-100 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 text-gray-500 font-medium bg-gray-50 whitespace-nowrap">{SPEC_LABELS[key]}</td>
                  {products.map((p, i) => {
                    const val = p.specs?.[key]
                    const highlight = bw[i]
                    return (
                      <td key={p.id} className={`px-4 py-3 text-center ${
                        highlight === 'best' ? 'bg-green-50 text-green-700 font-medium' :
                        highlight === 'worst' ? 'bg-red-50/60 text-red-600' : 'text-gray-800'
                      }`}>
                        {val ? String(val) : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

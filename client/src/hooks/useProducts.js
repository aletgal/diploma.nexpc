import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../api/products'

// Returns { products, total, pages } — consumers destructure what they need
export const useProducts = (params) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params).then((r) => r.data),
  })

// Returns a single product object
export const useProduct = (id) =>
  useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id).then((r) => r.data?.product ?? r.data),
    enabled: !!id,
  })

// Returns a plain array of featured products
export const useFeaturedProducts = () =>
  useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getFeatured().then((r) => r.data?.products ?? r.data ?? []),
  })

// Returns up to 3 hero-featured products for the rotating hero section
export const useHeroProducts = () =>
  useQuery({
    queryKey: ['products', 'hero'],
    queryFn: () => productsApi.getHero().then((r) => r.data?.products ?? r.data ?? []),
  })

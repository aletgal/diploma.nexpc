import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../api/products'

export const useProducts = (params) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params).then((r) => r.data),
  })

export const useProduct = (id) =>
  useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id).then((r) => r.data?.product ?? r.data),
    enabled: !!id,
  })

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.getFeatured().then((r) => r.data?.products ?? r.data ?? []),
  })

export const useHeroProducts = () =>
  useQuery({
    queryKey: ['products', 'hero'],
    queryFn: () => productsApi.getHero().then((r) => r.data?.products ?? r.data ?? []),
  })

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick } from 'lucide-react'
import { formatPrice } from '../../utils/formatters'

export const CATEGORY_BADGE_STYLES = {
  CPU:         { bg: '#dbeafe', text: '#1d4ed8' },
  GPU:         { bg: '#f3e8ff', text: '#7e22ce' },
  RAM:         { bg: '#dcfce7', text: '#15803d' },
  STORAGE:     { bg: '#ffedd5', text: '#c2410c' },
  MOTHERBOARD: { bg: '#fee2e2', text: '#b91c1c' },
  PSU:         { bg: '#fef9c3', text: '#a16207' },
  CASE:        { bg: '#f1f5f9', text: '#475569' },
  COOLING:     { bg: '#cffafe', text: '#0e7490' },
  FAN:         { bg: '#fce7f3', text: '#9d174d' },
}

const CATEGORY_ICONS = {
  CPU:         Cpu,
  GPU:         Monitor,
  RAM:         MemoryStick,
  STORAGE:     HardDrive,
  MOTHERBOARD: CircuitBoard,
  PSU:         Zap,
  CASE:        Box,
  COOLING:     Wind,
  FAN:         Wind,
}

export default function ComponentCard({ component }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)

  const inStock = component.stock > 0
  const imageUrl = !imgError && (component.imageUrl || component.images?.[0])
  const badgeStyle = CATEGORY_BADGE_STYLES[component.category]
  const FallbackIcon = CATEGORY_ICONS[component.category] ?? Cpu

  return (
    <div
      onClick={() => navigate(`/components/${component.id}`)}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s, transform 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        aspectRatio: '1/1',
        width: '100%',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={component.name}
            onError={() => setImgError(true)}
            style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', padding: 12 }}
          />
        ) : (
          <FallbackIcon style={{ width: 48, height: 48, color: '#cbd5e1' }} />
        )}
      </div>

      <div style={{ padding: '12px 14px' }}>
        {badgeStyle && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: badgeStyle.bg,
            color: badgeStyle.text,
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            marginBottom: 6,
          }}>
            {component.category}
          </span>
        )}

        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          lineHeight: 1.3,
          marginBottom: 4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {component.name}
        </p>

        <p style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>
          {formatPrice(component.price)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: inStock ? '#22c55e' : '#ef4444',
          }} />
          <span style={{ fontSize: 12, color: inStock ? '#16a34a' : '#dc2626' }}>
            {inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
    </div>
  )
}

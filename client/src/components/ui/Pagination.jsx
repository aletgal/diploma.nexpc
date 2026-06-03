import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pages, onPageChange }) {
  if (!pages || pages <= 1) return null

  const getPageNumbers = () => {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1)
    }

    const items = []

    if (page <= 4) {
      // Near the start
      for (let i = 1; i <= 5; i++) items.push(i)
      items.push('...')
      items.push(pages)
    } else if (page >= pages - 3) {
      // Near the end
      items.push(1)
      items.push('...')
      for (let i = pages - 4; i <= pages; i++) items.push(i)
    } else {
      // In the middle
      items.push(1)
      items.push('...')
      items.push(page - 1)
      items.push(page)
      items.push(page + 1)
      items.push('...')
      items.push(pages)
    }

    return items
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        className="btn-secondary px-3 py-2 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pageNumbers.map((num, idx) =>
        num === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-3 py-2 text-gray-400 select-none"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={num}
            onClick={() => onPageChange(num)}
            aria-current={num === page ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              num === page
                ? 'bg-primary-600 text-white'
                : 'btn-secondary'
            }`}
          >
            {num}
          </button>
        )
      )}

      <button
        className="btn-secondary px-3 py-2 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}

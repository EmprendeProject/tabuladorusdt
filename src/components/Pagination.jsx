import { ChevronLeft, ChevronRight } from 'lucide-react'

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 12,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5 // Máximo de números visibles

    if (totalPages <= maxVisible) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Lógica para mostrar páginas con elipsis
      if (currentPage <= 3) {
        // Inicio: 1 2 3 4 ... último
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Final: 1 ... antepenúltimo penúltimo último
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // Medio: 1 ... actual-1 actual actual+1 ... último
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={`flex flex-col items-center gap-4 py-6 ${className}`}>
      {/* Indicador de productos */}
      <p className="text-sm text-gray-600">
        Mostrando <span className="font-semibold">{startItem}</span> -{' '}
        <span className="font-semibold">{endItem}</span> de{' '}
        <span className="font-semibold">{totalItems}</span> productos
      </p>

      {/* Navegación */}
      <div className="flex items-center gap-1">
        {/* Botón Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Números de página */}
        {pageNumbers.map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="flex items-center justify-center w-9 h-9 text-gray-500"
              >
                ...
              </span>
            )
          }

          const isActive = page === currentPage

          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={
                isActive
                  ? 'flex items-center justify-center w-9 h-9 rounded-lg bg-black text-white font-semibold shadow-md'
                  : 'flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
              }
              aria-label={`Página ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          )
        })}

        {/* Botón Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

export default Pagination

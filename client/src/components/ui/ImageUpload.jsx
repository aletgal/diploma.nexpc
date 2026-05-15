import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import api from '../../api/client'

export default function ImageUpload({ onUpload, className = '' }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    setUploadedUrl(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.url
      setUploadedUrl(url)
      onUpload(url)
    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {uploadedUrl && (
          <div className="flex items-center gap-2">
            <img src={uploadedUrl} alt="Uploaded" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50" />
            <span className="text-xs text-gray-400 max-w-[180px] truncate">{uploadedUrl}</span>
            <button type="button" onClick={() => setUploadedUrl(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

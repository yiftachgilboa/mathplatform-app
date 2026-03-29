'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GameBackButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          width: 44, height: 44, borderRadius: '50%',
          background: 'white', border: '2px solid #ddd',
          fontSize: '1.2rem', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        ✕
      </button>
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            textAlign: 'center', fontFamily: 'Secular One, sans-serif'
          }}>
            <p style={{ marginBottom: 20, fontSize: '1.1rem' }}>בטוח שרוצה לצאת?</p>
            <button onClick={() => router.back()} style={{ marginLeft: 12, padding: '10px 24px', borderRadius: 8, background: '#e05050', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>יציאה</button>
            <button onClick={() => setShowConfirm(false)} style={{ padding: '10px 24px', borderRadius: 8, background: '#eee', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>המשך לשחק</button>
          </div>
        </div>
      )}
    </>
  )
}

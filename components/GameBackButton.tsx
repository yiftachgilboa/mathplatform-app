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
          width: 36, height: 36, borderRadius: '50%',
          background: '#111', border: '2px solid #111',
          color: '#fff', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', boxShadow: '2px 2px 0 #555',
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
            <p style={{
              fontSize: 18, fontWeight: 'bold',
              color: '#111', marginBottom: 20,
              textAlign: 'center',
            }}>
              בטוח שרוצה לצאת? ההתקדמות לא תישמר
            </p>
            <button onClick={() => router.back()} style={{ marginLeft: 12, padding: '10px 24px', borderRadius: 8, background: '#e05050', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>יציאה</button>
            <button onClick={() => setShowConfirm(false)} style={{
              padding: '10px 20px', borderRadius: 8,
              border: '2px solid #111', background: '#fff',
              color: '#111', fontSize: 16, cursor: 'pointer', fontWeight: 'bold',
            }}>המשך לשחק</button>
          </div>
        </div>
      )}
    </>
  )
}

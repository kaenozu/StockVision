import React from 'react'

const TestColor = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #581c87 0%, #1e3a8a 50%, #312e81 100%)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #facc15 0%, #f97316 100%)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          border: '2px solid #fde047',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 1rem 0'
          }}>
            🎨 SUPER COLORFUL TEST PAGE! 🎨
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: '600',
            margin: 0
          }}>
            これは確実にカラフルです！
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '12px',
            padding: '2rem',
            color: 'white',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>🔴 赤いカード</h2>
            <p style={{ margin: 0 }}>これは赤色のグラデーションです</p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: '12px',
            padding: '2rem',
            color: 'white',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>🟢 緑のカード</h2>
            <p style={{ margin: 0 }}>これは緑色のグラデーションです</p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '12px',
            padding: '2rem',
            color: 'white',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>🔵 青いカード</h2>
            <p style={{ margin: 0 }}>これは青色のグラデーションです</p>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
          borderRadius: '12px',
          padding: '2rem',
          color: 'white',
          boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>✨ 成功！ ✨</h2>
          <p style={{ fontSize: '1.25rem', margin: 0 }}>
            この画面が見えるということは、Reactコンポーネントが正常に動作しています！
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestColor
export default function HealthCheck() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a1929',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          ✅ StratoView Health Check
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#90caf9' }}>
          App is running successfully!
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#64b5f6' }}>
          Timestamp: {new Date().toISOString()}
        </p>
        <div style={{ marginTop: '2rem' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              marginRight: '1rem',
            }}
          >
            Go to Home
          </a>
          <a
            href="/map"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ff6f00',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
            }}
          >
            Go to Map
          </a>
        </div>
      </div>
    </div>
  )
}

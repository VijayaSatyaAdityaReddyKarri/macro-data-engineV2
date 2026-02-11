import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#05080a', color: '#fff' }}>
      <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20 }}>Macro Data Engine</h1>
      <Link 
        href="/macro" 
        style={{ padding: '12px 24px', background: '#d4af37', color: '#000', fontWeight: 'bold', borderRadius: 8, textDecoration: 'none' }}
      >
        Open Terminal ↗
      </Link>
    </div>
  );
}
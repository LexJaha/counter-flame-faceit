"use client";

export default function Home() {
  return (
    <main className="reset-screen">
      <div className="reset-glow" aria-hidden="true" />
      <header className="reset-header">
        <a className="reset-brand" href="/" aria-label="CounterFlame ana sayfa">
          <span className="reset-mark">CF</span>
          <span>COUNTER<span className="reset-accent">FLAME</span></span>
        </a>
        <span className="reset-status"><i /> FRESH START</span>
      </header>

      <section className="reset-content">
        <p className="reset-kicker">COUNTER-STRIKE 2 · COMPETITIVE PLATFORM</p>
        <h1>YENİ BİR<br /><span>BAŞLANGIÇ.</span></h1>
        <p className="reset-copy">
          Eski arayüz ve kategori yapısı sıfırlandı.
          CounterFlame şimdi temiz bir temel üzerinde yeniden kurulacak.
        </p>
        <div className="reset-rule"><span /></div>
        <p className="reset-foot">COUNTERFLAME <b>—</b> REBUILDING THE ARENA</p>
      </section>

      <footer className="reset-footer">
        <span>COUNTERFLAME</span>
        <span>NEW FOUNDATION / 2026</span>
      </footer>
    </main>
  );
}

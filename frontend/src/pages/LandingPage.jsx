import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Floating Navbar ──────────────────────────────────────────
function Navbar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed', top: 20, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 40,
        padding: '12px 24px',
        borderRadius: 100,
        background: scrolled ? 'rgba(8,8,8,0.85)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(52,211,153,0.12)',
        backdropFilter: 'blur(20px)',
        transition: 'background 0.3s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        fontFamily: 'Cabinet Grotesk, sans-serif',
        fontWeight: 800, fontSize: '1.1rem',
        letterSpacing: '-0.02em', color: '#ECFDF5'
      }}>
        Pay<span style={{ color: '#34D399' }}>Sure</span>
      </span>

      <div style={{ display: 'flex', gap: 28 }}>
        {[
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Features',     id: 'stats' },
  { label: 'Pricing',      id: 'cta' },
].map(({ label, id }) => (
  <a key={label} href="#"
    onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}
    style={{
      color: '#6B7280', fontSize: '0.85rem',
      fontWeight: 500, transition: 'color 0.2s',
      textDecoration: 'none'
    }}
    onMouseEnter={e => e.target.style.color = '#ECFDF5'}
    onMouseLeave={e => e.target.style.color = '#6B7280'}
  >{label}</a>
))}
      </div>

      <button
        className="btn-primary"
        style={{ padding: '8px 18px', fontSize: '0.82rem' }}
        onClick={onGetStarted}
      >
        Get Started
      </button>
    </motion.nav>
  )
}

// ── Parallax Orbs ────────────────────────────────────────────
function ParallaxOrbs() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 800], [0, 120])
  const y2 = useTransform(scrollY, [0, 800], [0, -80])
  const y3 = useTransform(scrollY, [0, 800], [0, 60])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <motion.div style={{
        position: 'absolute', borderRadius: '50%',
        filter: 'blur(80px)', pointerEvents: 'none',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(52,211,153,0.15), transparent)',
        top: -200, left: -200, opacity: 0.6, y: y1
      }} />
      <motion.div style={{
        position: 'absolute', borderRadius: '50%',
        filter: 'blur(80px)', pointerEvents: 'none',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent)',
        bottom: '10%', right: -100, opacity: 0.5, y: y2
      }} />
      <motion.div style={{
        position: 'absolute', borderRadius: '50%',
        filter: 'blur(80px)', pointerEvents: 'none',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(52,211,153,0.08), transparent)',
        top: '50%', left: '45%', opacity: 0.4, y: y3
      }} />
    </div>
  )
}

// ── Floating Glass Card ──────────────────────────────────────
function FloatingCard({ children, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.7, delay },
        y: { duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }
      }}
      style={{
        position: 'absolute',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(52,211,153,0.15)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16, padding: '20px 22px',
        ...style
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Counter ──────────────────────────────────────────────────
function Counter({ target }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        let start = 0
        const step = target / (1800 / 16)
        const timer = setInterval(() => {
          start = Math.min(start + step, target)
          setCount(Math.floor(start))
          if (start >= target) clearInterval(timer)
        }, 16)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref} style={{
      fontFamily: 'Cabinet Grotesk, sans-serif',
      fontSize: 'clamp(2.2rem, 4vw, 3rem)',
      fontWeight: 800, letterSpacing: '-0.03em', color: '#ECFDF5'
    }}>
      {count.toLocaleString('en-IN')}
    </span>
  )
}

// ── Reveal wrapper ───────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Main Landing Page ────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  const handleGetStarted = () => {
    setLeaving(true)
    setTimeout(() => navigate('/login'), 650)
  }

  return (
    <motion.div
      animate={leaving
        ? { opacity: 0, scale: 1.03, filter: 'blur(10px)' }
        : { opacity: 1, scale: 1, filter: 'blur(0px)' }
      }
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{ background: '#050A07', minHeight: '100vh', position: 'relative' }}
    >
      <ParallaxOrbs />
      <Navbar onGetStarted={handleGetStarted} />

        {/* HERO */}
        <section className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center pt-[120px] pb-[80px] px-[20px] sm:px-[40px] lg:px-[60px] gap-[40px] lg:gap-[60px] max-w-[1200px] mx-auto w-full">
          {/* Left */}
          <div className="flex-1 max-w-[600px] w-full text-center lg:text-left flex flex-col items-center lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.15)',
                padding: '5px 14px', borderRadius: 100,
                fontSize: '0.72rem', color: '#34D399',
                fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 28
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#34D399', display: 'inline-block'
              }} />
              Milestone-Based Escrow
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ marginBottom: 24, fontFamily: 'Cabinet Grotesk, sans-serif' }}
            >
              <span style={{ display: 'block' }}>Get paid.</span>
              <span style={{ display: 'block' }}>Every{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #34D399, #10B981, #059669)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>milestone.</span>
              </span>
              <span style={{ display: 'block' }}>No disputes.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[1rem] sm:text-[1.1rem] max-w-[460px] mb-[40px]"
            >
              PaySure locks client funds in secure escrow and releases them
              only when your work is verified — protecting both sides.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: 'flex', gap: 14, alignItems: 'center' }}
            >
              <button className="btn-primary" onClick={handleGetStarted}>
                Start for Free <ArrowRight size={16} />
              </button>
              <button className="btn-secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </button>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-[20px] sm:gap-[36px] mt-[40px] lg:mt-[52px] justify-center lg:justify-start flex-wrap"
            >
              {[
                { num: 12000, suffix: '+', label: 'Freelancers' },
                { num: 99, suffix: '%', label: 'Success Rate' },
                { num: 42, suffix: 'Cr+', label: 'Escrow Volume' },
              ].map(({ num, suffix, label }) => (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <Counter target={num} />
                    <span style={{
                      color: '#34D399', fontFamily: 'Cabinet Grotesk, sans-serif',
                      fontWeight: 700, fontSize: '1.2rem'
                    }}>{suffix}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2, letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — floating cards */}
          <div className="flex-1 relative min-h-[400px] lg:min-h-[500px] w-full hidden md:block">
            <FloatingCard delay={0.2} style={{ top: 40, left: 20, width: 250 }}>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Escrow Balance</div>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ECFDF5' }}>₹48,000</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                color: '#34D399', fontSize: '0.72rem', fontWeight: 500,
                padding: '3px 10px', borderRadius: 100, marginTop: 10
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                Funds Locked
              </div>
            </FloatingCard>

            <FloatingCard delay={0.35} style={{ top: 180, right: 0, width: 230 }}>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Milestones</div>
              {[
                { name: 'UI Design', tag: '✓ Released', color: '#6EE7B7', bg: 'rgba(110,231,183,0.1)' },
                { name: 'Frontend', tag: 'In Review', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
                { name: 'Backend', tag: 'Locked', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
              ].map(({ name, tag, color, bg }) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#ECFDF5' }}>{name}</span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 100, background: bg, color, fontWeight: 500 }}>{tag}</span>
                </div>
              ))}
            </FloatingCard>

            <FloatingCard delay={0.5} style={{ bottom: 60, left: 40, width: 210 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: '1rem' }}>✦</div>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: '#ECFDF5' }}>Payment Released</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Milestone approved</div>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: 10 }}>+₹16,000</div>
            </FloatingCard>

            <FloatingCard delay={0.15} style={{ top: 0, right: 50, width: 150, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '2.8rem', fontWeight: 800, color: '#34D399', lineHeight: 1 }}>94</div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Trust Score</div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '94%' }}
                  transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #34D399, #10B981)', borderRadius: 2 }}
                />
              </div>
            </FloatingCard>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="relative z-10 py-[60px] lg:py-[100px] px-[20px] sm:px-[40px] lg:px-[60px] max-w-[1200px] mx-auto w-full">
          <Reveal>
            <div className="section-label">Process</div>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Three steps to<br />secure payments</h2>
            <p className="section-sub" style={{ marginBottom: 56 }}>From invoice to payment — every step transparent.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {[
              { num: '01', icon: '📋', title: 'Create Invoice', desc: 'Define milestones, set amounts, send a professional invoice to your client instantly.' },
              { num: '02', icon: '🔒', title: 'Client Locks Funds', desc: 'Client deposits the full amount into PaySure escrow. Secured — neither party can touch it.' },
              { num: '03', icon: '⚡', title: 'Submit & Release', desc: 'Submit work, client approves, funds release instantly. Repeat per milestone.' },
            ].map(({ num, icon, title, desc }, i) => (
              <Reveal key={num} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16, padding: '32px 28px',
                    position: 'relative', overflow: 'hidden', cursor: 'default',
                  }}
                >
                  <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '4rem', fontWeight: 800, color: 'rgba(52,211,153,0.07)', position: 'absolute', top: 12, right: 16, lineHeight: 1 }}>{num}</div>
                  <div style={{ width: 44, height: 44, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 20 }}>{icon}</div>
                  <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#ECFDF5' }}>{title}</div>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: '#6B7280' }}>{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section id="stats" className="relative z-10 px-[20px] sm:px-[40px] lg:px-[60px] pb-[60px] lg:pb-[100px] max-w-[1200px] mx-auto w-full">
          <Reveal>
            <div className="bg-[#34D3990A] border border-[#34D3991F] rounded-[24px] p-[30px] lg:p-[56px_60px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px] text-center">
              {[
                { target: 12000, suffix: '+', label: 'Active Freelancers' },
                { target: 42, suffix: 'Cr+', label: 'Escrow Volume (₹)' },
                { target: 99, suffix: '%', label: 'Payment Success' },
                { target: 24, suffix: 'hr', label: 'Dispute Resolution' },
              ].map(({ target, suffix, label }) => (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                    <Counter target={target} />
                    <span style={{ color: '#34D399', fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>{suffix}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 6 }}>{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section id="cta" className="relative z-10 px-[20px] sm:px-[40px] lg:px-[60px] pb-[60px] lg:pb-[100px] max-w-[1200px] mx-auto w-full">
          <Reveal>
            <div className="bg-gradient-to-br from-[#34D39912] to-[#10B98108] border border-[#34D39926] rounded-[24px] p-[40px_20px] lg:p-[80px_60px] text-center relative overflow-hidden">
              <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 400, height: 200, background: 'radial-gradient(ellipse, rgba(52,211,153,0.1), transparent 70%)', pointerEvents: 'none' }} />
              <div className="section-label" style={{ marginBottom: 16 }}>Ready?</div>
              <h2 style={{ marginBottom: 16, fontFamily: 'Cabinet Grotesk, sans-serif', color: '#ECFDF5' }}>
                Stop chasing payments.<br />Start using PaySure.
              </h2>
              <p style={{ marginBottom: 36, fontSize: '1rem', color: '#6B7280' }}>Free to start. No commissions. Just secure milestone payments.</p>
              <div className="flex flex-col sm:flex-row gap-[14px] justify-center items-center">
                <button className="btn-primary" onClick={handleGetStarted}>
                  Create Free Account <ArrowRight size={16} />
                </button>
                <button className="btn-secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>Watch Demo</button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/5 py-[24px] lg:py-[36px] px-[20px] sm:px-[40px] lg:px-[60px] max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-[20px] w-full">
          <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#ECFDF5' }}>
            Pay<span style={{ color: '#34D399' }}>Sure</span>
          </span>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy', 'Terms', 'Docs', 'Contact'].map(l => (
              <a key={l} href="#" style={{ color: '#6B7280', fontSize: '0.8rem', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#ECFDF5'}
                onMouseLeave={e => e.target.style.color = '#6B7280'}
              >{l}</a>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>© 2025 PaySure</span>
        </footer>
    </motion.div>
  )
}
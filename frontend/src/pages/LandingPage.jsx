import React, { lazy, Suspense } from 'react';
import { useLanguage } from '../i18n/context';
import img1 from '../image/im1.jpeg';
import img2 from '../image/im2.jpeg';
import img3 from '../image/im3.jpeg';
const GlobeMap = lazy(() => import('../components/GlobeMap'));

function LangSwitcher() {
  const { languages, lang, setLang } = useLanguage();
  return (
    <div className="flex gap-1 bg-gray-100/50 rounded-lg p-0.5 backdrop-blur-sm">
      {languages.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            lang === l.code ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {l.code === 'ar' ? 'العربية' : l.code === 'fr' ? 'FR' : 'EN'}
        </button>
      ))}
    </div>
  );
}

function Navbar() {
  const { t, lang } = useLanguage();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-xl text-gray-800">AgriCopilot</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">{t('nav.howItWorks')}</a>
          <a href="#solutions" className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">{t('nav.solutions')}</a>
          <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">{t('nav.testimonials')}</a>
        </div>

        <div className="flex items-center gap-3">
          <LangSwitcher />
          <a href="/auth" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">{t('nav.signIn')}</a>
          <a href="/register" className="px-5 py-2 bg-gray-900 text-white rounded-full font-medium text-sm hover:bg-gray-800 transition">{t('nav.getStarted')}</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-gray-900 via-emerald-950 to-emerald-900 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-8rem)]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800/40 text-emerald-200 rounded-full text-sm font-medium backdrop-blur-sm">
            🚀 {t('landing.badge')}
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
            {t('landing.heroTitle')}{' '}
            <span className="text-emerald-400">{t('landing.heroHighlight')}</span>{' '}
            {t('landing.heroHighlightEnd')}
          </h1>

          <p className="text-xl text-emerald-100/70 max-w-lg">{t('landing.heroDesc')}</p>

          <div className="flex flex-wrap gap-4">
            <a href="/register" className="px-8 py-3 bg-emerald-500 text-white rounded-full font-semibold text-lg hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25">
              {t('landing.startFree')}
            </a>
            <a href="#how-it-works" className="px-8 py-3 border-2 border-emerald-700/50 text-emerald-200 rounded-full font-semibold text-lg hover:border-emerald-400 hover:text-white transition">
              {t('landing.seeHow')}
            </a>
          </div>

          <div className="flex items-center gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold text-white">12K+</p>
              <p className="text-sm text-emerald-200/60">{t('landing.farmersCount')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50K+</p>
              <p className="text-sm text-emerald-200/60">{t('landing.hectaresCount')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-sm text-emerald-200/60">{t('landing.accuracy')}</p>
            </div>
          </div>
        </div>

        <div className="relative h-[500px]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 to-emerald-400 rounded-full blur-3xl opacity-20" />
          <div className="relative w-full h-full overflow-hidden">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-sm text-emerald-200/60">Loading globe...</p>
                </div>
              </div>
            }>
              <GlobeMap />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problems() {
  const { t } = useLanguage();
  const problems = [
    {
      image: img1,
      title: t('landing.problem1Title'),
      desc: t('landing.problem1Desc'),
    },
    {
      image: img2,
      title: t('landing.problem2Title'),
      desc: t('landing.problem2Desc'),
    },
    {
      image: img3,
      title: t('landing.problem3Title'),
      desc: t('landing.problem3Desc'),
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            {t('landing.problemsTitle')}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t('landing.problemsDesc')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out overflow-hidden"
            >
               <div className="relative overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden rounded-t-3xl">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {p.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    { num: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { num: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { num: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
    { num: '04', title: t('landing.step4Title'), desc: t('landing.step4Desc') },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('landing.howTitle')}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('landing.howDesc')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="relative p-6 bg-farm-50 rounded-2xl border border-farm-100 hover:shadow-xl transition group">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-5 group-hover:border-agri-200 group-hover:shadow-md transition">
                <span className="text-lg font-bold text-gray-800">{step.num}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solutions() {
  const { t } = useLanguage();
  const solutions = [
    { title: t('landing.sol1Title'), desc: t('landing.sol1Desc') },
    { title: t('landing.sol2Title'), desc: t('landing.sol2Desc') },
    { title: t('landing.sol3Title'), desc: t('landing.sol3Desc') },
    { title: t('landing.sol4Title'), desc: t('landing.sol4Desc') },
    { title: t('landing.sol5Title'), desc: t('landing.sol5Desc') },
    { title: t('landing.sol6Title'), desc: t('landing.sol6Desc') },
  ];

  return (
    <section id="solutions" className="py-24 bg-farm-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('landing.solutionsTitle')}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('landing.solutionsDesc')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((s) => (
            <div key={s.title} className="p-6 rounded-2xl bg-white border border-farm-100 hover:border-farm-200 hover:shadow-lg transition group">
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useLanguage();
  const testimonials = [
    { quote: t('landing.testimonial1'), name: t('landing.testimonial1Name'), role: t('landing.testimonial1Role'), initials: 'FB' },
    { quote: t('landing.testimonial2'), name: t('landing.testimonial2Name'), role: t('landing.testimonial2Role'), initials: 'AL' },
    { quote: t('landing.testimonial3'), name: t('landing.testimonial3Name'), role: t('landing.testimonial3Role'), initials: 'HM' },
  ];

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('landing.testimonialTitle')}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">{t('landing.testimonialDesc')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div key={t.name} className="p-8 bg-farm-50 rounded-2xl border border-farm-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-agri-400 to-agri-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">{t.initials}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useLanguage();
  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 to-emerald-900 text-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-6">{t('landing.ctaTitle')}</h2>
        <p className="text-xl text-emerald-100/70 mb-10 max-w-2xl mx-auto">{t('landing.ctaDesc')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/register" className="px-8 py-3 bg-white text-gray-900 rounded-full font-semibold text-lg hover:bg-gray-100 transition shadow-xl">
            {t('landing.ctaButton')}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="py-16 bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-xl text-white">AgriCopilot</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            AI-Powered Agricultural Intelligence & Marketplace Platform.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-4">{t('landing.product')}</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#how-it-works" className="hover:text-white transition">{t('nav.howItWorks')}</a></li>
            <li><a href="#solutions" className="hover:text-white transition">{t('nav.solutions')}</a></li>
            <li><a href="/marketplace" className="hover:text-white transition">{t('nav.marketplace')}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-4">{t('landing.company')}</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-gray-500">Marathon Oujda 2026</span></li>
            <li><span className="text-gray-500">Team AgriCopilot</span></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-4">{t('landing.contact')}</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>📧 agricopilot@hackathon.ma</li>
            <li>📞 +212 6 00 00 00 00</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} AgriCopilot. {t('landing.allRights')}
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Problems />
      <HowItWorks />
      <Solutions />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
}

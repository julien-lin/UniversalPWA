import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { SEO } from './components/SEO'
import { Home } from './pages/Home'
import { Features } from './pages/Features'
import { Sponsors } from './pages/Sponsors'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <SEO />
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <SEO
                      title="Transform Any Web Project into a PWA | UniversalPWA"
                      description="Transform any web project into a Progressive Web App (PWA) with one click. UniversalPWA supports React, Vue, Angular, Next.js, WordPress, Symfony, Laravel, and more. Zero-config PWA generator with auto-detection."
                      keywords="PWA, Progressive Web App, PWA generator, PWA converter, transform to PWA, React PWA, Vue PWA, Angular PWA, WordPress PWA, Symfony PWA, Laravel PWA, service worker, web manifest, offline app, installable app"
                    />
                    <Home />
                  </>
                }
              />
              <Route
                path="/features"
                element={
                  <>
                    <SEO
                      title="PWA Features - UniversalPWA | Auto-Detection, Zero-Config, Multi-Framework"
                      description="Discover all UniversalPWA features: auto-detection, zero-config setup, multi-framework support, icon generation, service worker optimization, and more. Transform your web project into a PWA effortlessly."
                      keywords="PWA features, PWA generator features, auto-detect framework, zero-config PWA, multi-framework PWA, PWA icon generator, service worker generator, PWA manifest generator"
                    />
                    <Features />
                  </>
                }
              />
              <Route
                path="/sponsors"
                element={
                  <>
                    <SEO
                      title="Sponsor UniversalPWA - Support PWA Development"
                      description="Support UniversalPWA development and help make PWA creation accessible to everyone. Sponsor the project and get exclusive benefits."
                      keywords="sponsor PWA, support PWA development, PWA open source, GitHub sponsors, PWA funding"
                    />
                    <Sponsors />
                  </>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App

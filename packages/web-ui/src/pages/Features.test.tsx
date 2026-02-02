import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Features } from './Features'

function renderFeatures() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/features']}>
        <Routes>
          <Route path="/features" element={<Features />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('Features', () => {
  it('should render page title', () => {
    renderFeatures()
    expect(
      screen.getByRole('heading', { level: 1, name: /UniversalPWA Features/i }),
    ).toBeInTheDocument()
  })

  it('should render feature items', () => {
    renderFeatures()
    expect(screen.getByText('One-Click Conversion')).toBeInTheDocument()
    expect(screen.getByText('Framework Agnostic')).toBeInTheDocument()
    expect(screen.getByText('Auto-Detection')).toBeInTheDocument()
  })

  it('should render CTA section with npm link', () => {
    renderFeatures()
    const ctaLink = screen.getByRole('link', { name: /Install Now/i })
    expect(ctaLink).toHaveAttribute('href', 'https://www.npmjs.com/package/@julien-lin/universal-pwa-cli')
  })
})

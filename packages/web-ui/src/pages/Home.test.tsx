import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Home } from './Home'

function renderHome() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('Home', () => {
  it('should render hero title', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { level: 1, name: /Transform Any Web Project into a PWA/i }),
    ).toBeInTheDocument()
  })

  it('should render link to features page', () => {
    renderHome()
    const featuresLink = screen.getByRole('link', { name: /View Documentation/i })
    expect(featuresLink).toHaveAttribute('href', '/features')
  })

  it('should render quick start section', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { level: 2, name: /How to Create a PWA in 3 Simple Steps/i }),
    ).toBeInTheDocument()
  })

  it('should render npm install command', () => {
    renderHome()
    expect(
      screen.getByText(/npm install -g @julien-lin\/universal-pwa-cli/),
    ).toBeInTheDocument()
  })
})

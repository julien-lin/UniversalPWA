import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render UniversalPWA application', () => {
    render(<App />)
    
    // Check that the logo/brand name is rendered (multiple instances: header and footer)
    const brandElements = screen.getAllByText('UniversalPWA')
    expect(brandElements.length).toBeGreaterThan(0)
    
    // Check that navigation links are rendered (may appear in header and footer)
    const homeLinks = screen.getAllByText('Home')
    expect(homeLinks.length).toBeGreaterThan(0)
    
    const featuresLinks = screen.getAllByText('Features')
    expect(featuresLinks.length).toBeGreaterThan(0)
    
    const sponsorsLinks = screen.getAllByText('Sponsors')
    expect(sponsorsLinks.length).toBeGreaterThan(0)
  })
})


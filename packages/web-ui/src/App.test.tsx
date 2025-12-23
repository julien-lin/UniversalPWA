import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render', () => {
    render(<App />)
    const element = screen.getByText('App')
    expect(element).toBeInTheDocument()
  })
})


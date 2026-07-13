import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('renders the independence disclaimer and the three standard links', () => {
    render(<Footer />);
    expect(screen.getByText(/independent study aid/i)).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Delete account' })).toHaveAttribute('href', '/delete-account');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  });
});

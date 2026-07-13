import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { linkify } from '@/lib/linkify';

describe('linkify', () => {
  it('wraps every occurrence of a repeated label and preserves trailing text', () => {
    const text = 'Support is here. Contact Support for billing, or Support for anything else.';
    render(<p>{linkify(text, [{ label: 'Support', href: '/support' }])}</p>);

    const links = screen.getAllByRole('link', { name: 'Support' });
    expect(links).toHaveLength(3);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/support'));

    // No text lost after the 2nd/3rd occurrence.
    expect(screen.getByText(/for anything else\./)).toBeInTheDocument();
  });

  it('applies multiple distinct rules within one string', () => {
    const text = 'See Privacy policy and Delete account for details.';
    render(
      <p>
        {linkify(text, [
          { label: 'Privacy policy', href: '/privacy' },
          { label: 'Delete account', href: '/delete-account' },
        ])}
      </p>,
    );
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Delete account' })).toHaveAttribute('href', '/delete-account');
  });

  it('returns the plain string unchanged when there are no rules', () => {
    expect(linkify('plain text', [])).toBe('plain text');
  });
});

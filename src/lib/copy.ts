/**
 * Central copy module (manual §0.8): every user-facing string lives here,
 * marked WORKING until Anusha's voice pass. Do not hardcode copy in
 * components — import from here so the voice pass has one place to edit.
 */
export const WORKING = true;

export const brand = {
  name: 'ARNReady',
  tagline: 'Get ARN Ready.',
  motto: 'Knowledge is free. Mastery is earned.',
};

export const footerDisclaimer = {
  body: 'ARNReady is built by ASM Tech and is an independent study aid. It is not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. "NISM" is used only to describe the exam ARNReady helps you prepare for.',
  links: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/delete-account', label: 'Delete account' },
    { href: '/support', label: 'Support' },
  ],
};

export const nav = {
  primaryCta: { href: '/pricing', label: 'Get ARNReady' },
  signIn: { label: 'Sign in — coming soon' },
  links: [
    { href: '/syllabus', label: 'Syllabus' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
  ],
};

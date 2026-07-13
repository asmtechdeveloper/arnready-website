'use client';

// Isolated Milestone 1 prototype. WORKING copy and local sample state only.
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Arnie from '@/components/Arnie';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Grid,
  Layers,
  Lock,
  LogIn,
  Monitor,
  RefreshCw,
  Shield,
  Target,
  X,
  XCircle,
  Zap,
} from '@/components/Icon';

type View = 'home' | 'study' | 'practice';

const CHAPTERS = [
  ['Investment Landscape', '8%'],
  ['Concept and Role of a Mutual Fund', '6%'],
  ['Legal Structure of Mutual Funds in India', '4%'],
  ['Legal and Regulatory Framework', '10%'],
  ['Scheme Related Information', '10%'],
  ['Fund Distribution and Channel Management', '6%'],
  ['NAV, Total Expense Ratio and Pricing', '8%'],
  ['Taxation', '4%'],
  ['Investor Services', '15%'],
  ['Risk, Return and Performance of Funds', '7%'],
  ['Mutual Fund Scheme Performance', '7%'],
  ['Mutual Fund Scheme Selection', '15%'],
] as const;

const QUESTIONS = [
  {
    subtopic: 'The investment landscape',
    prompt: 'Which risk describes the possibility that rising prices reduce what your money can buy over time?',
    options: ['Liquidity risk', 'Inflation risk', 'Credit risk', 'Concentration risk'],
    correct: 1,
    explanation:
      'Inflation risk is the loss of purchasing power when the return on an investment does not keep pace with rising prices.',
  },
  {
    subtopic: 'Financial goals',
    prompt: 'A goal due in eighteen months would usually be classified as which type of financial goal?',
    options: ['Immediate goal', 'Short-term goal', 'Medium-term goal', 'Long-term goal'],
    correct: 1,
    explanation:
      'A goal due in one to three years is generally treated as short term. The investment choice should reflect that limited time horizon.',
  },
  {
    subtopic: 'Risk and return',
    prompt: 'What does diversification primarily aim to reduce in an investment portfolio?',
    options: ['All market risk', 'Company-specific risk', 'Inflation', 'The investment horizon'],
    correct: 1,
    explanation:
      'Diversification spreads exposure across investments. It can reduce company-specific risk, but it cannot remove market-wide risk.',
  },
] as const;

const MODES = [
  { label: 'Practice', detail: 'Instant explanations', icon: BookOpen, tone: 'purple' },
  { label: 'Chapter exam', detail: '30-question dress rehearsal', icon: Target, tone: 'ink' },
  { label: 'Full mock', detail: '100 questions · 120 min', icon: Monitor, tone: 'ink' },
  { label: 'Flashcards', detail: 'All chapters · always free', icon: Layers, tone: 'green' },
  { label: 'Mistakes', detail: 'Sign in to build your deck', icon: Zap, tone: 'amber' },
] as const;

function PrototypeHeader({ view, onView }: { view: View; onView: (view: View) => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={() => onView('home')}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl text-left"
          aria-label="Open prototype homepage"
        >
          <Image src="/favicon.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="hidden text-xl font-black tracking-tight text-purple min-[410px]:inline">ARNReady</span>
        </button>
        <nav className="flex items-center gap-1 rounded-full border border-line bg-white p-1 shadow-card" aria-label="Prototype views">
          {([
            ['home', 'Home'],
            ['study', 'Study room'],
            ['practice', 'Question'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              aria-current={view === id ? 'page' : undefined}
              className={`min-h-11 rounded-full px-3 text-xs font-black transition-colors sm:px-4 ${
                view === id ? 'bg-purple text-white' : 'text-muted hover:bg-purple-soft hover:text-purple'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="border-t border-amber/30 bg-amber-soft px-4 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.16em] text-ink">
        Working prototype · Local sample data · Nothing is saved
      </div>
    </header>
  );
}

function PrimaryButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-purple-dark active:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}

function HomeView({ onStudy }: { onStudy: () => void }) {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-purple-soft" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white px-3 py-1.5 text-xs font-black text-purple shadow-card">
              <Shield size={15} aria-hidden="true" />
              NISM Series V-A · Mutual Fund Distributors
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.55rem]">
              Earning your ARN<br />
              <span className="text-purple">should be fun.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              WORKING: I built ARNReady because you deserve better than boring PDFs and wrong answers. I&apos;ll help you practise, test you honestly, and bring along a panda who is not easily impressed.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <PrimaryButton onClick={onStudy} className="sm:px-8">
                Start practising free <ArrowRight size={18} aria-hidden="true" />
              </PrimaryButton>
              <span className="text-center text-xs font-bold leading-5 text-muted sm:text-left">
                20 questions per chapter<br />No sign-in to begin
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-[28px] border border-line bg-white p-5 shadow-lift sm:p-7">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted">Today&apos;s session</span>
                <span className="rounded-full bg-green-soft px-3 py-1 text-xs font-black text-green">12 min</span>
              </div>
              <div className="mt-5 flex items-center gap-4 rounded-card bg-purple-soft p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple text-white">
                  <BookOpen size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-purple">Recommended next</p>
                  <p className="mt-0.5 font-black text-ink">Investment Landscape</p>
                  <p className="text-xs text-muted">Continue with question 7</p>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-xs font-bold text-muted">I&apos;ll keep your score honest</p>
                  <p className="mt-1 text-sm font-black text-ink">6 correct · 7 attempted</p>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
                  <div className="h-full w-[70%] rounded-full bg-green" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-2 sm:-right-16">
              <Arnie mood="working" size={150} priority className="drop-shadow-sm" />
            </div>
            <p className="absolute -bottom-6 left-4 max-w-48 text-xs font-bold leading-5 text-muted sm:-left-2">
              WORKING: Arnie is cautiously impressed. For Arnie, this is practically a standing ovation.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-9 max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green">Your path to the ARN</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-ink">Build before you measure</h2>
          <p className="mt-3 text-sm leading-6 text-muted">WORKING: Read the chapter. Practise the concepts. Sit the exam. One chapter at a time—that is the whole trick.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [BookOpen, 'First, we build', 'I’ll explain every answer while you practise. We build the knowledge before anyone reaches for a score.'],
            [Target, 'Then, I test you', 'When you’re ready, Exam Mode gives you no peeking midway. Sit with it. Finish it. That is rather the point.'],
            [Monitor, 'Finally, we rehearse', 'We’ll sit a full 100-question, 120-minute mock, weighted chapter by chapter. Laptop strongly recommended. [VERIFY]'],
          ].map(([Icon, title, copy]) => (
            <article key={String(title)} className="rounded-card border border-line bg-white p-6 shadow-card">
              <span className="inline-flex rounded-xl bg-purple-soft p-3 text-purple"><Icon size={22} aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-black text-ink">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">WORKING: {copy as string}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green">No trial-clock nonsense</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink">Free means free. We checked.</h2>
            <p className="mt-4 text-sm leading-6 text-muted">WORKING: I won&apos;t ask for card details or start a trial clock. You do not even need an account to begin. Arnie will allow it.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['20 questions', 'in every chapter'],
              ['All flashcards', 'free, across 12 chapters'],
              ['1 full mock', 'per signed-in account'],
              ['₹250 once', 'full bank and unlimited mocks'],
            ].map(([title, detail]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-cream p-4">
                <CheckCircle className="shrink-0 text-green" size={20} aria-hidden="true" />
                <div><p className="font-black text-ink">{title}</p><p className="text-xs text-muted">WORKING: {detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-3xl font-black text-ink">Chapter 1 is waiting. So is Arnie.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">WORKING: Every ARN holder started exactly here. I&apos;ll keep your first session simple: no account, no card, no drama.</p>
        <PrimaryButton onClick={onStudy} className="mt-7">Start practising free <ArrowRight size={18} /></PrimaryButton>
      </section>
      <PrototypeFooter />
    </main>
  );
}

function StudyView({ onPractice }: { onPractice: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green">Your calm corner</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">The study room</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">WORKING: I&apos;ve kept your study room ready. Everything is free to start; sign in only when you want me to save progress across devices.</p>
        </div>
        <div className="hidden md:block"><Arnie mood="reading" size={116} /></div>
      </section>

      <section className="mt-8 grid overflow-hidden rounded-[24px] bg-purple text-white shadow-lift lg:grid-cols-[1fr_auto]">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-purple-soft"><Clock size={15} /> Recommended next · 12 minutes</div>
          <h2 className="mt-3 text-2xl font-black">Continue Investment Landscape</h2>
          <p className="mt-2 text-sm leading-6 text-purple-soft">WORKING: You left off at question 7. I&apos;ve kept your place. Inflation still has a few things to say.</p>
          <button type="button" onClick={onPractice} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-purple transition hover:-translate-y-0.5">
            Continue practice <ArrowRight size={17} />
          </button>
        </div>
        <div className="flex min-w-56 items-center justify-center border-t border-white/20 bg-white/10 p-6 lg:border-l lg:border-t-0">
          <div className="w-full max-w-48">
            <div className="flex items-center justify-between text-xs font-bold"><span>Chapter progress</span><span>6 / 20</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[30%] rounded-full bg-white" /></div>
            <p className="mt-3 text-xs leading-5 text-purple-soft">I&apos;ll keep this unfinished session local in the prototype.</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Choose a study mode</p><h2 className="mt-1 text-2xl font-black text-ink">What fits today?</h2></div>
          <span className="hidden text-xs font-bold text-muted sm:block">WORKING: Five ways in, one recommended path</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MODES.map(({ label, detail, icon: Icon, tone }, index) => (
            <button
              key={label}
              type="button"
              onClick={index === 0 ? onPractice : undefined}
              className={`min-h-36 rounded-card border p-5 text-left shadow-card transition hover:-translate-y-0.5 ${index === 0 ? 'border-purple bg-purple-soft' : 'border-line bg-white'}`}
            >
              <span className={`inline-flex rounded-xl p-2.5 ${tone === 'purple' ? 'bg-purple text-white' : tone === 'green' ? 'bg-green-soft text-green' : tone === 'amber' ? 'bg-amber-soft text-amber' : 'bg-cream text-ink'}`}><Icon size={20} /></span>
              <p className="mt-4 font-black text-ink">{label}</p><p className="mt-1 text-xs leading-5 text-muted">WORKING: {detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Full syllabus</p><h2 className="mt-1 text-2xl font-black text-ink">Choose a chapter</h2></div><Grid className="text-purple" size={24} /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map(([title, weight], index) => (
            <article key={title} className="flex min-h-48 flex-col rounded-card border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-muted">Chapter {index + 1}</span><span className="rounded-full bg-cream px-2.5 py-1 text-xs font-black text-ink">{weight} weight</span></div>
              <h3 className="mt-3 flex-1 font-black leading-5 text-ink">{title}</h3>
              <p className="mt-3 text-xs text-muted">WORKING: 20 free questions</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={onPractice} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-purple px-3 text-xs font-black text-white hover:bg-purple-dark"><BookOpen size={14} /> Practice</button>
                <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-purple px-3 text-xs font-black text-purple hover:bg-purple-soft"><Target size={14} /> Exam</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-card border border-line bg-white p-5 sm:p-6" aria-labelledby="sample-states-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Representative treatments</p><h2 id="sample-states-heading" className="mt-1 text-xl font-black text-ink">When the room needs to explain itself</h2></div><p className="text-xs text-muted">WORKING prototype states</p></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-cream p-4"><div className="flex items-center gap-2 font-black text-ink"><RefreshCw className="animate-spin text-purple motion-reduce:animate-none" size={17} /> Loading progress</div><div className="mt-3 h-2 w-full animate-pulse rounded-full bg-line motion-reduce:animate-none" /><p className="mt-2 text-xs text-muted">I&apos;m checking for your latest saved session…</p></div>
          <div className="rounded-2xl bg-cream p-4"><div className="flex items-center gap-2 font-black text-ink"><Layers className="text-muted" size={17} /> Nothing saved yet</div><p className="mt-3 text-xs leading-5 text-muted">Start any free chapter. Every ARN holder started exactly here.</p></div>
          <div className="rounded-2xl border border-red/30 bg-red-soft p-4"><div className="flex items-center gap-2 font-black text-ink"><XCircle className="text-red" size={17} /> I couldn&apos;t load progress</div><p className="mt-3 text-xs leading-5 text-muted">Nothing you&apos;ve done is lost, and your study tools still work. Try me again.</p><button type="button" className="mt-1 min-h-11 text-xs font-black text-red underline underline-offset-2">Try again</button></div>
        </div>
      </section>
    </main>
  );
}

function Journey({ current }: { current: number }) {
  const steps = [
    { label: 'Q1–10', state: current <= 10 ? 'active' : 'done' },
    { label: 'Gate', state: current <= 10 ? 'future' : 'done' },
    { label: 'Q11–15', state: current <= 10 ? 'future' : current <= 15 ? 'active' : 'done' },
    { label: 'Gate', state: current <= 15 ? 'future' : 'done' },
    { label: 'Q16–20', state: current <= 15 ? 'future' : current <= 20 ? 'active' : 'done' },
    { label: 'Paywall', state: 'future' },
  ];
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-widest text-muted">Free chapter journey</p><span className="text-xs font-bold text-muted">Locked sequence</span></div>
      <div className="mt-3 grid grid-cols-6 gap-1" aria-label="Question 1 to 10, gate, question 11 to 15, gate, question 16 to 20, paywall">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="min-w-0 text-center">
            <div className={`flex h-8 items-center justify-center rounded-lg border px-1 ${step.state === 'done' ? 'border-green bg-green-soft text-green' : step.state === 'active' ? 'border-purple bg-purple text-white' : 'border-line bg-cream text-muted'}`}>{step.label === 'Gate' || step.label === 'Paywall' ? <Lock size={12} aria-hidden="true" /> : <span className="truncate text-[10px] font-black">{step.label}</span>}</div>
            <p className="mt-1 truncate text-[9px] font-bold text-muted">{step.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-4 text-muted">WORKING: Q1–10 → rewarded-ad gate → Q11–15 → rewarded-ad gate → Q16–20 → paywall. The order never changes.</p>
    </div>
  );
}

function PracticeView({ onStudy }: { onStudy: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const question = QUESTIONS[questionIndex];
  const questionNumber = 7 + questionIndex;
  const revealed = picked !== null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (picked === null && ['1', '2', '3', '4'].includes(event.key)) setPicked(Number(event.key) - 1);
      if (event.key === 'ArrowRight' && picked !== null && questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex((value) => value + 1);
        setPicked(null);
      }
      if (event.key === 'ArrowLeft' && questionIndex > 0) {
        setQuestionIndex((value) => value - 1);
        setPicked(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, questionIndex]);

  const move = (delta: number) => {
    setQuestionIndex((value) => Math.max(0, Math.min(QUESTIONS.length - 1, value + delta)));
    setPicked(null);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onStudy} className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-black text-muted hover:text-purple"><ArrowLeft size={17} /> Study room</button>
        <span className="rounded-full bg-purple-soft px-3 py-1.5 text-xs font-black text-purple">Practice · Free journey</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section>
          <div className="rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-8">
            <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-green">Chapter 1 · Investment Landscape</p><h1 className="mt-1 text-xl font-black text-ink sm:text-2xl">Question {questionNumber} of 20</h1></div>
              <div className="w-full sm:w-44"><div className="flex justify-between text-[11px] font-bold text-muted"><span>Chapter progress</span><span>{questionNumber}/20</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-purple transition-all" style={{ width: `${(questionNumber / 20) * 100}%` }} /></div></div>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-widest text-muted">{question.subtopic}</p>
            <h2 className="mt-2 text-lg font-black leading-7 text-ink sm:text-xl">{question.prompt}</h2>
            <div className="mt-6 space-y-3" role="group" aria-label="Answer options">
              {question.options.map((option, index) => {
                const selected = picked === index;
                const correct = question.correct === index;
                const state = revealed && correct ? 'correct' : revealed && selected ? 'incorrect' : selected ? 'selected' : 'idle';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => picked === null && setPicked(index)}
                    disabled={revealed}
                    aria-pressed={selected}
                    className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition ${state === 'correct' ? 'border-green bg-green-soft' : state === 'incorrect' ? 'border-red bg-red-soft' : state === 'selected' ? 'border-purple bg-purple-soft' : revealed ? 'border-line bg-white opacity-55' : 'border-line bg-white hover:border-purple hover:bg-purple-soft'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${state === 'correct' ? 'bg-green text-white' : state === 'incorrect' ? 'bg-red text-white' : state === 'selected' ? 'bg-purple text-white' : 'bg-cream text-muted'}`}>{state === 'correct' ? <Check size={15} /> : state === 'incorrect' ? <X size={15} /> : String.fromCharCode(65 + index)}</span>
                    <span className="pt-0.5 text-sm font-bold leading-6 text-ink">{option}</span>
                    {state === 'correct' && <span className="ml-auto pt-1 text-xs font-black text-green">Correct</span>}
                    {state === 'incorrect' && <span className="ml-auto pt-1 text-xs font-black text-red">Your answer</span>}
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <div className={`mt-6 rounded-2xl border p-5 ${picked === question.correct ? 'border-green/30 bg-green-soft' : 'border-red/30 bg-red-soft'}`} aria-live="polite">
                <div className="flex items-center gap-2 font-black text-ink">{picked === question.correct ? <CheckCircle className="text-green" size={20} /> : <XCircle className="text-red" size={20} />}{picked === question.correct ? 'That is correct' : 'Not quite — here is the useful bit'}</div>
                <p className="mt-3 text-sm leading-6 text-ink">WORKING: {question.explanation}</p>
              </div>
            ) : (
              <p className="mt-5 text-xs font-bold text-muted">Choose an answer to see feedback · Keyboard: 1–4</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => move(-1)} disabled={questionIndex === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-white px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={17} /> Previous</button>
            <button type="button" onClick={() => move(1)} disabled={!revealed || questionIndex === QUESTIONS.length - 1} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-purple px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-line disabled:text-muted">Next question <ArrowRight size={17} /></button>
          </div>
        </section>

        <aside className="space-y-4">
          <Journey current={questionNumber} />
          <div className="rounded-2xl bg-purple-soft p-5">
            <div className="flex items-start gap-3"><LogIn className="mt-0.5 shrink-0 text-purple" size={19} /><div><p className="font-black text-ink">Keep studying signed out</p><p className="mt-1 text-xs leading-5 text-muted">WORKING: I won&apos;t interrupt an answer for sign-in. Ask me to save your progress and mistakes when you&apos;re ready.</p></div></div>
          </div>
          <div className="hidden justify-center lg:flex"><Arnie mood="thinking" size={124} /></div>
        </aside>
      </div>
    </main>
  );
}

function PrototypeFooter() {
  return (
    <footer className="border-t border-line bg-white px-4 py-8 text-center">
      <p className="mx-auto max-w-2xl text-xs leading-5 text-muted">WORKING: ARNReady is built by ASM Tech and is an independent study aid. It is not affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI.</p>
      <p className="mt-2 text-xs font-bold text-ink">Knowledge is free. Mastery is earned.</p>
    </footer>
  );
}

export default function PrototypeExperience() {
  const [view, setView] = useState<View>('home');
  const changeView = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div className="min-h-screen bg-cream text-ink">
      <PrototypeHeader view={view} onView={changeView} />
      {view === 'home' && <HomeView onStudy={() => changeView('study')} />}
      {view === 'study' && <StudyView onPractice={() => changeView('practice')} />}
      {view === 'practice' && <PracticeView onStudy={() => changeView('study')} />}
    </div>
  );
}

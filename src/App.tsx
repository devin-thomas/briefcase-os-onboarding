import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, CircleUserRound, Clipboard, Download, MapPin, Moon, Palette, Printer, Save, Sun, Target, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dump } from 'js-yaml';
import { buildCandidateExport, createCandidate, fillSampleCandidate, parseList, type CandidateProfile, type CapabilityResponse, type PriorityKey, type ResumeExtractionRequest, type ResumeExtractionResult, type WorkArrangement } from './domain';

const STEPS = ['Interface & basics', 'Resume', 'Career targets', 'Locations & restrictions', 'Agent intelligence'];
const DRAFT_KEY = 'briefcaseos.demo.candidate-draft.v1';
const STEP_KEY = 'briefcaseos.demo.onboarding-step.v1';
const PREF_KEY = 'briefcaseos.demo.preferences.v1';
const PORTFOLIO_URL = 'https://devthomas.site/';
const accents = [{ name: 'Outlook blue', value: '#2f80ed' }, { name: 'Cyan', value: '#18a6b8' }, { name: 'Verdant', value: '#2e9b72' }, { name: 'Coral', value: '#e1654f' }, { name: 'Amber', value: '#d8952d' }];

type StepProps = { candidate: CandidateProfile; update: (recipe: (current: CandidateProfile) => CandidateProfile) => void };

function readCandidate(): CandidateProfile {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || createCandidate(); }
  catch { return createCandidate(); }
}

function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function requestExtraction(payload: ResumeExtractionRequest): Promise<ResumeExtractionResult> {
  const response = await fetch('/api/parse-resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json() as ResumeExtractionResult & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || 'Resume extraction failed.');
  return body;
}

export default function App() {
  const [candidate, setCandidate] = useState<CandidateProfile>(readCandidate);
  const [step, setStep] = useState(() => Number(localStorage.getItem(STEP_KEY)) || 1);
  const [savedAt, setSavedAt] = useState('');
  const [capabilities, setCapabilities] = useState<CapabilityResponse>({ resumeExtraction: { available: true, mode: 'demo', supports: ['sample', 'pasted-text'] } });
  const [storageWarning, setStorageWarning] = useState('');
  const update = (recipe: (current: CandidateProfile) => CandidateProfile) => setCandidate((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }));

  useEffect(() => { void fetch('/api/capabilities').then((response) => response.json()).then(setCapabilities).catch(() => undefined); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = candidate.interface.theme;
    document.documentElement.style.setProperty('--accent', candidate.interface.accent);
    document.documentElement.style.colorScheme = candidate.interface.theme;
    localStorage.setItem(PREF_KEY, JSON.stringify({ theme: candidate.interface.theme, accent: candidate.interface.accent }));
  }, [candidate.interface]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(candidate));
        localStorage.setItem(STEP_KEY, String(step));
        setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
        setStorageWarning('');
      } catch {
        setStorageWarning('This browser could not save the draft. Your current form remains open.');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [candidate, step]);

  const clearLocalData = () => {
    [DRAFT_KEY, STEP_KEY, PREF_KEY, 'briefcaseos.candidate-draft.v2', 'briefcaseos.candidate-draft.v3'].forEach((key) => localStorage.removeItem(key));
    setCandidate(createCandidate());
    setStep(1);
    setStorageWarning('Local candidate data cleared.');
  };

  if (step === 6) return <Completion candidate={candidate} clearLocalData={clearLocalData} />;
  const panels = [
    <Basics candidate={candidate} update={update} />,
    <ResumeStep candidate={candidate} update={update} capabilities={capabilities} />,
    <Career candidate={candidate} update={update} />,
    <Logistics candidate={candidate} update={update} />,
    <AgentStep candidate={candidate} update={update} />,
  ];

  return <div className="app-shell">
    <BrandHeader candidate={candidate} update={update} savedAt={savedAt} clearLocalData={clearLocalData} />
    <nav className="progress-rail" aria-label="Onboarding progress">{STEPS.map((label, index) => {
      const number = index + 1;
      const passed = step > number;
      return <button key={label} className={step === number ? 'active' : passed ? 'passed' : ''} onClick={() => setStep(number)}><span>{passed ? <Check /> : number}</span><strong>{label}</strong></button>;
    })}</nav>
    {storageWarning ? <div className="global-note" role="status">{storageWarning}</div> : null}
    <div className="wizard-layout"><main className="wizard-main">
      <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: .22 }}>{panels[step - 1]}</motion.div></AnimatePresence>
      <footer className="step-actions"><button className="back-action" disabled={step === 1} onClick={() => setStep(step - 1)}><ArrowLeft />Back</button><span>{step} of 5</span><button className="primary-action" disabled={candidate.resume.status === 'parsing'} onClick={() => {
        if (step === 5) update((current) => ({ ...current, onboarding: { ...current.onboarding, status: 'ready-for-review' } }));
        setStep(step + 1);
      }}>{step === 5 ? 'Pack my briefcase' : 'Continue'}<ArrowRight /></button></footer>
    </main><CandidateSignal candidate={candidate} /></div>
  </div>;
}

function BrandHeader({ candidate, update, savedAt, clearLocalData }: StepProps & { savedAt: string; clearLocalData: () => void }) {
  return <header className="brand-header"><a className="brand" href="/"><span><BriefcaseBusiness /></span>BriefcaseOS</a><div className="header-tools"><a className="portfolio-link" href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Devin Thomas portfolio <ArrowRight /></a><p><Save />{savedAt ? `Saved ${savedAt}` : 'Saving locally'}</p><div className="quick-theme"><button aria-label="Use light theme" className={candidate.interface.theme === 'light' ? 'selected' : ''} onClick={() => update((current) => ({ ...current, interface: { ...current.interface, theme: 'light' } }))}><Sun /></button><button aria-label="Use dark theme" className={candidate.interface.theme === 'dark' ? 'selected' : ''} onClick={() => update((current) => ({ ...current, interface: { ...current.interface, theme: 'dark' } }))}><Moon /></button></div><button className="clear-button" onClick={clearLocalData}><Trash2 />Clear local data</button></div></header>;
}

function CandidateSignal({ candidate }: { candidate: CandidateProfile }) {
  const progress = Math.min(100, 12 + Number(Boolean(candidate.identity.name)) * 18 + Number(candidate.resume.status === 'complete') * 34 + candidate.career.primaryRoleFamilies.length * 8 + candidate.logistics.workArrangements.length * 5);
  return <aside className="candidate-signal"><header><div><h2>Your candidate signal</h2><p>Live view of what an agent receives.</p></div><CircleUserRound /></header>
    <Signal icon={<CircleUserRound />} title={candidate.identity.name || 'Identity open'} body={candidate.identity.email || 'Add a name and email to anchor the profile.'} />
    <Signal icon={<BriefcaseBusiness />} title={candidate.resume.parsed.skills.length ? `${candidate.resume.parsed.skills.length} core strengths` : 'Strengths waiting'} body={candidate.resume.parsed.skills.slice(0, 5).join(', ') || 'Use the fictional sample or paste resume text.'} />
    <Signal icon={<Target />} title={candidate.career.primaryRoleFamilies.length ? 'Role strategy set' : 'Role strategy open'} body={candidate.career.primaryRoleFamilies.slice(0, 3).join(', ') || 'Target role families shape downstream scoring.'} />
    <Signal icon={<MapPin />} title={candidate.logistics.workArrangements.join(' + ')} body={candidate.logistics.currentLocation || 'Add a home base and location rules.'} />
    <div className="signal-foot"><span style={{ width: `${progress}%` }} /><p>Profile grows as you go</p></div>
  </aside>;
}

function Signal({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="signal-item"><span>{icon}</span><div><strong>{title}</strong><p>{body}</p></div></div>;
}

function Basics({ candidate, update }: StepProps) {
  return <section className="step-content"><Heading n="01" title="Make it feel like yours." text="Set the workspace, then give the candidate model a stable identity." />
    <div className="demo-banner sample-launch"><div><strong>Explore with a complete fictional profile</strong><p>Fill every field across all five steps, then click through to inspect how BriefcaseOS turns candidate choices into portable artifacts.</p></div><button className="primary-action inline" onClick={() => update(fillSampleCandidate)}>Fill every field with the sample</button></div>
    <div className="field-group theme-field"><div><label>Interface theme</label><p className="field-help">Stored only in this browser and excluded from candidate exports.</p></div><div className="segmented"><button className={candidate.interface.theme === 'dark' ? 'selected' : ''} onClick={() => update((current) => ({ ...current, interface: { ...current.interface, theme: 'dark' } }))}><Moon />Dark</button><button className={candidate.interface.theme === 'light' ? 'selected' : ''} onClick={() => update((current) => ({ ...current, interface: { ...current.interface, theme: 'light' } }))}><Sun />Light</button></div></div>
    <div className="field-group"><label>Accent color</label><div className="accent-row">{accents.map((color) => <button key={color.value} aria-label={color.name} className={`swatch ${candidate.interface.accent === color.value ? 'selected' : ''}`} style={{ background: color.value }} onClick={() => update((current) => ({ ...current, interface: { ...current.interface, accent: color.value } }))} />)}<Palette /><input aria-label="Custom accent" type="color" value={candidate.interface.accent} onChange={(event) => update((current) => ({ ...current, interface: { ...current.interface, accent: event.target.value } }))} /></div></div>
    <div className="form-grid three"><Field label="Full name" value={candidate.identity.name} onChange={(value) => update((current) => ({ ...current, identity: { ...current.identity, name: value } }))} /><Field label="Email" type="email" value={candidate.identity.email} onChange={(value) => update((current) => ({ ...current, identity: { ...current.identity, email: value } }))} /><Field label="Phone (optional)" value={candidate.identity.phone} onChange={(value) => update((current) => ({ ...current, identity: { ...current.identity, phone: value } }))} /></div>
    <div className="form-grid three"><Field label="LinkedIn" value={candidate.professionalLinks.linkedIn} onChange={(value) => update((current) => ({ ...current, professionalLinks: { ...current.professionalLinks, linkedIn: value } }))} /><Field label="GitHub" value={candidate.professionalLinks.github} onChange={(value) => update((current) => ({ ...current, professionalLinks: { ...current.professionalLinks, github: value } }))} /><Field label="Portfolio" value={candidate.professionalLinks.portfolio} onChange={(value) => update((current) => ({ ...current, professionalLinks: { ...current.professionalLinks, portfolio: value } }))} /></div>
  </section>;
}

function ResumeStep({ candidate, update, capabilities }: StepProps & { capabilities: CapabilityResponse }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [consented, setConsented] = useState(false);
  const run = async (payload: ResumeExtractionRequest) => {
    update((current) => ({ ...current, resume: { ...current.resume, status: 'parsing', message: 'Structuring candidate evidence…' } }));
    try {
      const result = await requestExtraction({ ...payload, consentGiven: payload.sampleId ? undefined : consented });
      update((current) => ({
        ...current,
        identity: { ...current.identity, ...result.identity },
        logistics: { ...current.logistics, currentLocation: result.currentLocation || current.logistics.currentLocation },
        career: { ...current.career, primaryRoleFamilies: result.parsed.inferredTitles.length ? result.parsed.inferredTitles : current.career.primaryRoleFamilies },
        resume: { ...current.resume, parsed: result.parsed, status: 'complete', message: result.metadata.warnings.join(' ') || 'Extraction complete.' },
      }));
    } catch (error) {
      update((current) => ({ ...current, resume: { ...current.resume, status: 'error', message: error instanceof Error ? error.message : 'Extraction failed.' } }));
    }
  };
  const pickFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      update((current) => ({ ...current, resume: { ...current.resume, status: 'error', message: 'Files must be 8 MB or smaller.' } }));
      return;
    }
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowed.includes(file.type || 'text/plain')) {
      update((current) => ({ ...current, resume: { ...current.resume, status: 'error', message: 'Use PDF, plain text, or Markdown.' } }));
      return;
    }
    const metadata = { id: crypto.randomUUID(), fileName: file.name, mimeType: file.type || 'text/plain', sizeBytes: file.size, addedAt: new Date().toISOString() };
    const plainText = file.type.startsWith('text/') ? await file.text() : undefined;
    const dataBase64 = file.type === 'application/pdf' ? await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }) : undefined;
    update((current) => ({ ...current, resume: { ...current.resume, artifacts: [metadata] } }));
    await run({ typedResume: candidate.resume.sourceText, artifacts: [{ ...metadata, plainText, dataBase64 }] });
  };
  const live = capabilities.resumeExtraction.mode === 'live';
  return <section className="step-content"><Heading n="02" title="Start with evidence." text="Review the loaded sample evidence, or replace it with your own résumé text." />
    {live ? <label className="consent-row"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />I understand that submitted resume content will be sent to the configured server and {capabilities.resumeExtraction.processorLabel} for processing.</label> : null}
    <label className="full-field">Resume text<textarea rows={10} placeholder="Paste a resume or rough career history…" value={candidate.resume.sourceText} onChange={(event) => update((current) => ({ ...current, resume: { ...current.resume, sourceText: event.target.value } }))} /></label>
    <div className="resume-actions"><button className="secondary-action" disabled={!candidate.resume.sourceText.trim() || (live && !consented)} onClick={() => void run({ typedResume: candidate.resume.sourceText, artifacts: [] })}>{candidate.resume.status === 'parsing' ? 'Extracting…' : 'Extract details'}</button><button className="secondary-action" disabled={(live && !consented) || !capabilities.resumeExtraction.supports.includes('application/pdf')} onClick={() => fileRef.current?.click()}><Upload />Upload PDF</button><input ref={fileRef} hidden type="file" accept=".pdf,.txt,.md" onChange={(event) => void pickFile(event.target.files?.[0])} /></div>
    {candidate.resume.status !== 'idle' ? <div className={`parse-status ${candidate.resume.status}`} role="status"><span /><div><strong>{candidate.resume.status === 'complete' ? 'Review what we found' : candidate.resume.status === 'error' ? 'Extraction needs attention' : 'Reading candidate evidence'}</strong><p>{candidate.resume.message}</p></div></div> : null}
    {candidate.resume.status === 'complete' ? <div className="field-group"><div className="form-grid three"><Field label="Name" value={candidate.identity.name} onChange={(value) => update((current) => ({ ...current, identity: { ...current.identity, name: value } }))} /><Field label="Email" value={candidate.identity.email} onChange={(value) => update((current) => ({ ...current, identity: { ...current.identity, email: value } }))} /><Field label="Location" value={candidate.logistics.currentLocation} onChange={(value) => update((current) => ({ ...current, logistics: { ...current.logistics, currentLocation: value } }))} /></div><ListField label="Skills" value={candidate.resume.parsed.skills} onChange={(skills) => update((current) => ({ ...current, resume: { ...current.resume, parsed: { ...current.resume.parsed, skills } } }))} /></div> : null}
    <p className="privacy-copy">Drafts are saved only in this browser. Raw uploaded file bytes are kept in memory for extraction and are never included in candidate exports.</p>
  </section>;
}

function Career({ candidate, update }: StepProps) {
  return <section className="step-content"><Heading n="03" title="Define the work worth finding." text="Separate target roles from bridge options, exclusions, and responsibilities." />
    <ListField label="Primary role families" value={candidate.career.primaryRoleFamilies} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, primaryRoleFamilies: value } }))} placeholder="Technical Support Engineer, AI Enablement Analyst" />
    <ListField label="Bridge role families" value={candidate.career.bridgeRoleFamilies} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, bridgeRoleFamilies: value } }))} />
    <ListField label="Excluded role families" value={candidate.career.excludedRoleFamilies} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, excludedRoleFamilies: value } }))} />
    <div className="form-grid two"><ListField label="Desired responsibilities" value={candidate.career.desiredResponsibilities} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, desiredResponsibilities: value } }))} /><ListField label="Responsibilities to avoid" value={candidate.career.avoidedResponsibilities} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, avoidedResponsibilities: value } }))} /></div>
    <Field label="Minimum annual base compensation" type="number" value={candidate.career.minimumBaseAnnual?.toString() || ''} onChange={(value) => update((current) => ({ ...current, career: { ...current.career, minimumBaseAnnual: value ? Number(value) : null } }))} />
  </section>;
}

function Logistics({ candidate, update }: StepProps) {
  const toggle = (value: WorkArrangement) => update((current) => ({ ...current, logistics: { ...current.logistics, workArrangements: current.logistics.workArrangements.includes(value) ? current.logistics.workArrangements.filter((item) => item !== value) : [...current.logistics.workArrangements, value] } }));
  return <section className="step-content"><Heading n="04" title="Make constraints explicit." text="Location and schedule rules should be interpretable instead of buried in notes." />
    <div className="form-grid two"><Field label="Current location" value={candidate.logistics.currentLocation} onChange={(value) => update((current) => ({ ...current, logistics: { ...current.logistics, currentLocation: value } }))} /><ListField label="Acceptable relocation locations" value={candidate.logistics.acceptableLocations} onChange={(value) => update((current) => ({ ...current, logistics: { ...current.logistics, acceptableLocations: value } }))} /></div>
    <fieldset className="field-group"><legend>Work arrangements</legend><div className="arrangement-grid">{(['onsite', 'hybrid', 'remote'] as const).map((value) => <button key={value} className={candidate.logistics.workArrangements.includes(value) ? 'selected' : ''} onClick={() => toggle(value)}><MapPin /><strong>{value}</strong><span>{value === 'remote' ? 'Distributed work' : value === 'hybrid' ? 'Office plus remote' : 'Location-based work'}</span></button>)}</div></fieldset>
    <div className="form-grid three"><Field label="Latest acceptable shift end" type="time" value={candidate.logistics.latestShiftEnd} onChange={(value) => update((current) => ({ ...current, logistics: { ...current.logistics, latestShiftEnd: value } }))} /><label>Unknown schedule behavior<select value={candidate.logistics.unknownBehavior} onChange={(event) => update((current) => ({ ...current, logistics: { ...current.logistics, unknownBehavior: event.target.value as CandidateProfile['logistics']['unknownBehavior'] } }))}><option value="neutral">Neutral</option><option value="review">Queue for review</option><option value="slight-penalty">Slight penalty</option><option value="reject">Reject</option></select></label><Field label="Work authorization" value={candidate.logistics.workAuthorization} onChange={(value) => update((current) => ({ ...current, logistics: { ...current.logistics, workAuthorization: value } }))} /></div>
  </section>;
}

const PRIORITY_KEYS: PriorityKey[] = ['compensation', 'flexibility', 'growth', 'workLifeBalance'];
const PRIORITY_COLORS = ['#2f80ed', '#18a6b8', '#71d3a2', '#d8952d'] as const;
type PermissionKey = keyof CandidateProfile['agent']['permissions'];
const PERMISSION_LABELS: Record<PermissionKey, string> = {
  retrieveJobs: 'Retrieve jobs',
  scoreJobs: 'Score jobs',
  draftPackages: 'Draft application packages',
  modifyFiles: 'Modify files',
  contactPeople: 'Contact people',
  submitApplications: 'Submit applications',
};

function piePoint(fraction: number, radius: number) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
}

function pieSlicePath(start: number, end: number) {
  if (end - start >= 0.999999) {
    return 'M 50 4 A 46 46 0 1 1 50 96 A 46 46 0 1 1 50 4 Z';
  }
  const startPoint = piePoint(start, 46);
  const endPoint = piePoint(end, 46);
  const largeArc = end - start > 0.5 ? 1 : 0;
  return ['M 50 50', 'L ' + startPoint.x + ' ' + startPoint.y, 'A 46 46 0 ' + largeArc + ' 1 ' + endPoint.x + ' ' + endPoint.y, 'Z'].join(' ');
}

function PriorityChart({ priorities, labels }: { priorities: CandidateProfile['agent']['priorities']; labels: CandidateProfile['agent']['priorityLabels'] }) {
  const total = PRIORITY_KEYS.reduce((sum, key) => sum + priorities[key], 0);
  let offset = 0;
  const segments = PRIORITY_KEYS.map((key, index) => {
    const share = total > 0 ? priorities[key] / total : 0;
    const start = offset;
    offset += share;
    return { key, color: PRIORITY_COLORS[index], share, start, end: offset };
  });
  return <div className="priority-chart">
    <div className="priority-chart__visual">
      <svg viewBox="0 0 100 100" role="img" aria-label="Normalized representation of your four priorities">
        {total === 0 ? <circle className="priority-chart__empty" cx="50" cy="50" r="46" /> : null}
        {segments.filter((segment) => segment.share > 0).map((segment) => {
          const labelPoint = piePoint(segment.start + segment.share / 2, 29);
          const percentage = Math.round(segment.share * 100);
          return <g key={segment.key} className="priority-chart__segment"><path d={pieSlicePath(segment.start, segment.end)} fill={segment.color}><title>{labels[segment.key] + ': ' + percentage + '%'}</title></path>{segment.share >= 0.07 ? <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="central">{percentage}%</text> : null}</g>;
        })}
      </svg>
    </div>
    <div className="priority-chart__legend">{PRIORITY_KEYS.map((key, index) => <button type="button" className="priority-chart__item" key={key} onClick={() => document.getElementById('priority-range-' + key)?.focus()}><span className="priority-chart__swatch" style={{ backgroundColor: PRIORITY_COLORS[index] }} /><span>{labels[key]}</span></button>)}</div>
  </div>;
}

function AgentStep({ candidate, update }: StepProps) {
  return <section className="step-content"><Heading n="05" title="Tune the agent’s judgment." text="Define ranking priorities, claim guardrails, and actions that require approval." />
    <div className="form-grid two"><label>Ranking objective<select value={candidate.agent.rankingObjective} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, rankingObjective: event.target.value as CandidateProfile['agent']['rankingObjective'] } }))}><option value="balanced">Balanced strategy</option><option value="best-fit">Best qualification fit</option><option value="interview-probability">Highest interview probability</option><option value="compensation">Highest compensation</option><option value="career-trajectory">Best career trajectory</option></select></label><label>Resume length<select value={candidate.agent.resumeMaxPages} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, resumeMaxPages: Number(event.target.value) as 1 | 2 | 3 } }))}><option value="1">1 page</option><option value="2">2 pages</option><option value="3">3 pages</option></select></label></div>
    <fieldset className="priority-field"><legend>What matters most?</legend><div className="priority-editor"><div className="priority-sliders">{PRIORITY_KEYS.map((key, index) => <div className="priority-row" key={key}><div className="priority-row__head"><label htmlFor={'priority-label-' + key}>Choice {index + 1}</label><output>{candidate.agent.priorities[key]}</output></div><input id={'priority-label-' + key} className="priority-label" value={candidate.agent.priorityLabels[key]} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, priorityLabels: { ...current.agent.priorityLabels, [key]: event.target.value } } }))} aria-label={'Name priority choice ' + (index + 1)} /><input id={'priority-range-' + key} type="range" min="0" max="100" value={candidate.agent.priorities[key]} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, priorities: { ...current.agent.priorities, [key]: Number(event.target.value) } } }))} aria-label={'Weight for ' + candidate.agent.priorityLabels[key]} /></div>)}</div><PriorityChart priorities={candidate.agent.priorities} labels={candidate.agent.priorityLabels} /></div></fieldset>
    <Field label="Preferred tone for your résumés and cover letters" value={candidate.agent.tone} onChange={(value) => update((current) => ({ ...current, agent: { ...current.agent, tone: value } }))} />
    <ListField label="Claims the agent must never make" value={candidate.agent.claimGuardrails} onChange={(value) => update((current) => ({ ...current, agent: { ...current.agent, claimGuardrails: value } }))} />
    <fieldset className="permission-field"><legend>What may an agent do without approval?</legend><div className="permission-grid">{(Object.keys(candidate.agent.permissions) as PermissionKey[]).map((key) => <label className="check-row" key={key}><input type="checkbox" checked={candidate.agent.permissions[key]} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, permissions: { ...current.agent.permissions, [key]: event.target.checked } } }))} /><span>{PERMISSION_LABELS[key]}</span></label>)}</div></fieldset>
    <div className="form-grid two"><ListField label="Open questions" value={candidate.onboarding.uncertainties} onChange={(value) => update((current) => ({ ...current, onboarding: { ...current.onboarding, uncertainties: value } }))} /><ListField label="Confirmed decisions" value={candidate.onboarding.decisions} onChange={(value) => update((current) => ({ ...current, onboarding: { ...current.onboarding, decisions: value } }))} /></div>
    <label className="full-field">Strategy notes<textarea rows={4} value={candidate.agent.notes} onChange={(event) => update((current) => ({ ...current, agent: { ...current.agent, notes: event.target.value } }))} /></label>
  </section>;
}

function Completion({ candidate, clearLocalData }: { candidate: CandidateProfile; clearLocalData: () => void }) {
  const reduced = useReducedMotion();
  const [view, setView] = useState<'resume' | 'json' | 'yaml'>('resume');
  const [copied, setCopied] = useState(false);
  const exported = useMemo(() => buildCandidateExport(candidate), [candidate]);
  const jsonText = useMemo(() => JSON.stringify(exported, null, 2), [exported]);
  const yamlText = useMemo(() => dump(exported, { noRefs: true, lineWidth: 100 }), [exported]);
  const stem = (candidate.identity.name || 'candidate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'candidate';
  useEffect(() => {
    if (!reduced) void confetti({ particleCount: 55, spread: 75, origin: { y: .18 }, colors: [candidate.interface.accent, '#71d3a2', '#e1654f'] });
  }, [candidate.interface.accent, reduced]);
  const handoff = async () => {
    await navigator.clipboard.writeText(`Continue my BriefcaseOS onboarding using the attached ${stem}.candidate.json. Review the profile, call out uncertainties, and ask one high-value question at a time.`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const jobs = candidate.resume.parsed.experience.length ? candidate.resume.parsed.experience : [{ company: 'Fictional Company', title: candidate.resume.parsed.headline || 'Candidate profile', dates: 'Ready for review', highlights: [candidate.resume.parsed.summary || 'Complete the resume step to populate this preview.'] }];
  const downloadCurrentView = () => {
    if (view === 'resume') {
      window.print();
      return;
    }
    downloadText(view === 'json' ? jsonText : yamlText, stem + '.candidate.' + view, view === 'json' ? 'application/json' : 'text/yaml');
  };
  return <main className="completion-page"><div className="completion-status"><span><Check /></span>Candidate model ready</div><header className="completion-heading"><h1>Your briefcase is packed.</h1><p>Review the synthetic-ready artifacts before handing them to an agent.</p></header>
    <div className="completion-workbench"><section className="document-stage"><div className="document-toolbar"><div className="document-tabs" role="tablist" aria-label="Artifact previews"><button role="tab" aria-selected={view === 'resume'} className={view === 'resume' ? 'active' : ''} onClick={() => setView('resume')}>Résumé</button><button role="tab" aria-selected={view === 'json'} className={view === 'json' ? 'active' : ''} onClick={() => setView('json')}>candidate.json</button><button role="tab" aria-selected={view === 'yaml'} className={view === 'yaml' ? 'active' : ''} onClick={() => setView('yaml')}>candidate.yaml</button></div><button className="document-download" onClick={downloadCurrentView}>{view === 'resume' ? <Printer /> : <Download />}{view === 'resume' ? 'Save PDF' : 'Download ' + view.toUpperCase()}</button></div>
      {view === 'resume' ? <article className="resume-paper"><header><h2>{candidate.identity.name || 'Your Name'}</h2><p>{candidate.resume.parsed.headline || candidate.career.primaryRoleFamilies[0] || 'Candidate Profile'}</p><div>{[candidate.identity.email, candidate.identity.phone, candidate.logistics.currentLocation].filter(Boolean).join(' · ')}</div></header><section><h3>Profile</h3><p>{candidate.resume.parsed.summary || candidate.agent.notes || 'A structured candidate profile prepared for personalized job discovery.'}</p></section><section><h3>Experience</h3>{jobs.map((job) => <div className="resume-role" key={`${job.company}-${job.title}`}><div><strong>{job.title}</strong><span>{job.dates}</span></div><em>{job.company}</em><ul>{job.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</section><section><h3>Skills</h3><p>{candidate.resume.parsed.skills.join(' · ') || 'Skills pending review.'}</p></section></article> : <CodeView content={view === 'json' ? jsonText : yamlText} label={view === 'json' ? 'Candidate JSON' : 'Candidate YAML'} />}
    </section><aside className="handoff-rail"><div className="success-case"><BriefcaseBusiness /></div><h2>Portable by design.</h2><p>Candidate facts, preferences, scoring policy, and authorization boundaries are separated from interface and provider configuration.</p><small>Continue</small><button className="primary-action" onClick={() => void handoff()}><Clipboard />{copied ? 'Prompt copied' : 'Copy agent handoff'}</button><button className="text-action" onClick={clearLocalData}>Clear local data and restart</button><p className="privacy-copy">Credentials, provider settings, source text, and raw file bytes are excluded from exports.</p></aside></div>
  </main>;
}

function CodeView({ content, label }: { content: string; label: string }) {
  return <pre className="code-view" aria-label={label} tabIndex={0}>{content.split('\n').map((line, index) => <span key={index + '-' + line}><i>{index + 1}</i>{line || ' '}</span>)}</pre>;
}

function Heading({ n, title, text }: { n: string; title: string; text: string }) {
  return <header className="step-heading"><span>{n}</span><div><h1>{title}</h1><p>{text}</p></div></header>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ListField({ label, value, onChange, placeholder = 'Add comma- or line-separated values' }: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    onChange([...value, ...parseList(draft)].filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index));
    setDraft('');
  };
  return <label className="tag-field">{label}<div className="tag-entry-row"><input value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
    if (event.key === 'Enter') { event.preventDefault(); add(); }
  }} /><button type="button" onClick={add}>Add</button></div><div className="tag-list">{value.map((item) => <span className="tag-chip" key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((candidate) => candidate !== item))}>×</button></span>)}</div></label>;
}

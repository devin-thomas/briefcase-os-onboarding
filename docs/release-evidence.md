# Release evidence

This document records the technical evidence produced for the clean-room portfolio release.

## Verified revision

- Evidence source revision: `94487e0df3602fddde1cf26e184a14bc8b21b73d`
- GitHub Actions workflow: `Verify`
- Workflow run: `38` (`30573308739`)
- Result: passed
- Evidence archive digest: `sha256:647fc0efb47c14b7b5570b27697345dd2dc9ffd49fccc2ec8c9863262377be96`

Later documentation-only commits remain subject to the same permanent verification workflow.

## Successful checks

1. Reproducible dependency installation with the committed npm lockfile.
2. Strict TypeScript type checking.
3. Unit tests covering deterministic extraction, sanitized exports, draft migration, browser-storage migration, schema alignment, and optional live-provider failure handling.
4. Production Vite client build.
5. Bundled generic Node server build.
6. Chromium installation in a clean runner.
7. Complete fictional onboarding journey on desktop and mobile.
8. Automated accessibility scans at entry, evidence review, and completion states.
9. Responsive horizontal-overflow check on the mobile viewport.
10. Browser console and unhandled-error check.
11. Candidate-data reset verification.
12. Public-source audit for credential-shaped values, personal fixtures, retired infrastructure references, and forbidden deployment files or dependencies.
13. Dependency license inventory generation.
14. Portfolio screenshot capture and evidence upload.

## Accessibility findings resolved during verification

The rendered checks identified and verified fixes for:

- insufficient primary-action contrast;
- insufficient skill-chip contrast;
- mobile progress labels being visually hidden in a way that removed accessible names;
- low-contrast YAML line numbers; and
- a nested YAML scroll region without keyboard access.

The final desktop and mobile journeys completed with no serious or critical automated accessibility violations.

## Dependency evidence

The generated inventory covers **170 installed packages** with **zero unknown licenses**. See [dependency-licenses.md](dependency-licenses.md).

## Portfolio captures

The checked-in images were derived from the successful rendered test run:

- `images/onboarding-entry.png`
- `images/sample-profile-review.png`
- `images/completion-workbench.png`
- `images/mobile-onboarding.png`

They contain only fictional candidate data.

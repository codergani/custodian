## Description
<!-- Provide a brief description of the changes in this PR -->

## Security & Architecture Checklist
- [ ] No unencrypted secrets, tokens, or private keys are exposed or logged.
- [ ] Zero-knowledge client-side encryption invariant is maintained.
- [ ] No sensitive values are hardcoded in test scripts or committed files.
- [ ] Clipboard auto-clearing / memory sanitization respected where applicable.

## Testing Checklist
- [ ] `npm test -- --run` passes locally without failures.
- [ ] `npm run build` succeeds without bundling errors.
- [ ] New unit or integration tests added for new functionality.

## Related Issues
<!-- Link to issue: fixes #123 -->

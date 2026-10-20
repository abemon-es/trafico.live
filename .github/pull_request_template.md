## Summary
Brief description of changes.

## Type
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Other

## Changes
-

## Testing
- [ ] Build passes (`npm run build`)
- [ ] Tested locally
- [ ] No console errors

## Deploy
- [ ] Changes the collector image (`services/collector/**`, `prisma/schema.prisma`,
      `prisma.config.ts`, `src/lib/{alert-matcher,bluesky,db,redis,social-broadcast,telegram,web-push,x-api}.ts`,
      `src/lib/email/ses.ts`; the list is `services/collector/Dockerfile.cron`). No merge
      rule: since server#614 the deployer waits after the build until no job would be cut
      and a safe minute comes (75 min cap, then it fails and pages). If in doubt, run
      `docker exec deployer /scripts/deploy-trafico-collectors.sh --guard-check`.

## Related Issues
Closes #

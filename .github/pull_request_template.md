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
      `src/lib/email/ses.ts`; the list is `services/collector/Dockerfile.cron`). The deploy
      recreates all 6 collectors and kills any job in flight: merge with 0 `TASK=` in
      frequent/daily/weekly/fuel (`docker top <c> -eo pid,args` from the host; without the
      pid column it fails), on an odd minute that is not a multiple of 5 (x1, x3, x7, x9),
      second 00-10, and not 19:20-19:31Z (aemet-forecast). Builds take 4-50 s, so the
      recreation stays in that minute, where only the `*` realtime jobs run.

## Related Issues
Closes #

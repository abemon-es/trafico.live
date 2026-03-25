# Security Policy

## Supported Versions

Only the latest version deployed at [trafico.live](https://trafico.live) receives security updates.

| Version | Supported |
|---------|-----------|
| Latest (production) | Yes |
| Older builds | No |

## Reporting a Vulnerability

Send an email to **security@trafico.live** with the subject line:

```
Security: [brief description]
```

Please do not open a public GitHub issue for security vulnerabilities.

### What to include

- A clear description of the vulnerability
- Step-by-step reproduction instructions
- Affected URL(s) or endpoint(s)
- Potential impact assessment (data exposure, privilege escalation, etc.)
- Any supporting evidence (screenshots, request/response samples)

### Response timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | 48 hours |
| Initial assessment | 7 days |
| Fix or mitigation | Depends on severity |

## Scope

This policy covers the **trafico.live** domain and all its API endpoints.

Out of scope: third-party services integrated into the site (report those directly to the respective vendor).

## Rules of Engagement

- Do **not** publicly disclose a vulnerability before a fix has been released
- Do **not** perform denial-of-service (DoS/DDoS) testing
- Do **not** access, modify, or delete data belonging to other users
- Do **not** conduct automated scanning that generates significant load on production systems

## Recognition

Reporters who follow this policy responsibly will be credited in the release notes (if they wish to be named). We appreciate every good-faith report that helps keep trafico.live safe.

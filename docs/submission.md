# Submission package

Never paste secret values here or into submission fields.

| Required item | Final value | State |
|---|---|---|
| Public API base URL | TO BE CREATED | Hosting account and deployment needed |
| Health URL | `<base>/health` | Local tests complete; external check pending |
| Optimization endpoint | `POST <base>/optimize-energy` | Local tests complete; external check pending |
| GitHub repository | TO BE CREATED | Private during event, public after deadline |
| README/configuration | `README.md`, `.env.example` | Prepared |
| Provider/model | OpenAI / `gpt-4.1-mini-2025-04-14` default | Match actual deployed configuration |
| Docker registry tag | TO BE PUBLISHED | Local image is not a pullable registry reference |
| Image digest | TO BE RECORDED | Obtain after registry push and pull |
| Container port | `3000` | Binds to `0.0.0.0`; runtime secret injection |
| Video artifact | `deliverables/gridwise-solution.mp4` | Upload and verify access |
| Video link | TO BE UPLOADED | ≤3 minutes; accessible throughout judging |

## Final checklist

- [ ] Repository created after question reveal, private during event.
- [ ] Team reviewed and understands the solution; dependencies and AI assistance credited.
- [ ] Final code passes `npm ci`, `npm test`, and `npm run test:live`.
- [ ] Public endpoints work without login/VPN; tested from outside development environment.
- [ ] Readiness <60s and requests <30s; record uncached p95 and failure rate.
- [ ] Hosted model, credentials, quota and service remain available during evaluation.
- [ ] Registry image pushed, pulled, and tested from the documented commands; exact tag/digest recorded.
- [ ] No credentials in repository, image, logs, video or public fields.
- [ ] Video ≤3 minutes, uploaded, and judge access verified.
- [ ] Endpoint URL, repository URL, README/configuration, image reference and video submitted.
- [ ] Repository made public after submission deadline; all artifacts retained for evaluation.

See `docs/deployment.md` for account creation and publishing. Local tests do not complete external deployment, registry publication or organizer submission.

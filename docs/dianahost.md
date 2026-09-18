# DianaHost deployment through cPanel — Node.js 20.20.2

This guide uses the separate compatibility profile in `deploy/dianahost/`. The main project and existing Docker/Render dependency versions remain independent. Upload the prepared `artifacts/gridwise-dianahost-node20.zip`, not a ZIP of the root repository.

The profile pins NestJS 11.2.5, Swagger 11.4.7, OpenAI SDK 6.49.0, and a separate lockfile. A scoped override pins Multer 2.4.0 because the older NestJS adapter otherwise selects a release with known advisories. It uses the same application source, LP solver, prompt and `gpt-4.1-mini-2025-04-14` model. The package includes compiled JavaScript; you do not need a server terminal or a server-side build. Source and tests are included for reproducibility. No key, `.env`, or local `node_modules` is included.

Local verification does not establish that DianaHost's Passenger configuration, network, resources or timeouts will work. Complete the browser and public HTTP checks below before replacing the existing submission URL. Node.js 20 is end-of-life; ask DianaHost for a supported runtime when available.

## 1. Create the API subdomain

Log in to DianaHost cPanel. Open **Domains → Create A New Domain** (or **Subdomains**, depending on the theme). Create `api.YOURDOMAIN.com`. Use a separate document root rather than sharing your main website's directory. Replace `YOURDOMAIN.com` with your actual domain everywhere below.

If DNS is managed at DianaHost, check that the subdomain resolves to the hosting server. If DNS is managed elsewhere, create an A record named `api` using the server IP shown in your hosting account. Keep existing website/mail records intact. Enable SSL for the subdomain through **SSL/TLS Status → Run AutoSSL**, if available; otherwise ask support to issue the certificate.

## 2. Create a Node.js application

Open **Software → Setup Node.js App → Create Application**. Configure:

| Field | Value |
|---|---|
| Node.js version | `20.20.2` |
| Application mode | `Production` |
| Application root | `gridwise` |
| Application URL | Select `api.YOURDOMAIN.com`, with an empty path or `/` |
| Application startup file | `app.js` |
| Passenger log file, if offered | `/home/CPANEL_USERNAME/gridwise/passenger.log` |

`gridwise` is relative to the account's home directory: typically `/home/CPANEL_USERNAME/gridwise`. Keep it outside `public_html` and outside the subdomain's static document root. Click **Create**. The panel may generate a placeholder `app.js`; the upload replaces that placeholder only. If this account already has an application named `gridwise`, use a new empty directory and match its name in the root setting.

If the panel lacks the Node.js application manager or rejects this directory, ask support to register this application for you. Do not upload the server package as a static website.

## 3. Upload the prepared ZIP

Open **File Manager**, navigate to `/home/CPANEL_USERNAME/gridwise`, and upload `gridwise-dianahost-node20.zip`. Extract it **inside this directory**. The files must be directly at:

```text
/home/CPANEL_USERNAME/gridwise/app.js
/home/CPANEL_USERNAME/gridwise/package.json
/home/CPANEL_USERNAME/gridwise/package-lock.json
/home/CPANEL_USERNAME/gridwise/dist/main.js
```

There must not be an extra nested `gridwise-dianahost-node20` directory. Allow replacement of the new application's placeholder `app.js`. Keep any `node_modules` symlink or configuration files created by cPanel. Remove the uploaded ZIP after extracting it. Do not upload your local `.env` or `node_modules`.

## 4. Configure the environment

Return to **Setup Node.js App**, edit this app, and add these environment variables using **Add Variable**:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | Your actual key, entered only in the panel |
| `OPENAI_MODEL` | `gpt-4.1-mini-2025-04-14` |

Save the settings. Keep timeout/cache defaults initially. Do not set `PORT=443`, put a URL in `PORT`, or append `:3000` to the public URL. Passenger normally routes HTTPS requests to the application's listener automatically; follow a specific port instruction only if DianaHost supplies one.

## 5. Install and restart

Click **Run NPM Install** and wait for successful completion. Then click **Restart** (or **Start App** if stopped). The compiled `dist` directory is already present. Do not run `npm start` through a temporary script runner; the application manager owns the server process. No database or Docker installation is needed on this hosting plan.

If dependency installation is missing, fails, or reports Node engine errors, verify you uploaded this compatibility package and selected `20.20.2`. Ask support to run the installation in the configured application environment if the panel cannot do it.

## 6. Test in your browser

Visit `https://api.YOURDOMAIN.com/health`. Expected response:

```json
{"status":"ok"}
```

Visit `https://api.YOURDOMAIN.com/docs`. Expand **POST /optimize-energy**, select **Try it out**, replace the request body with the contents of the included `examples/request.json`, and click **Execute**. Do not add an API key to the request.

Expected: HTTP 200, 24 hourly plan entries, total cost **38365 BDT**, total grid energy **2692.5 kWh**, and ordered directive interpretations. A different but equally optimal hourly schedule is valid. `/health` alone does not prove that the server can reach OpenAI or that quota is available. The bare `/` path may return 404; use the actual endpoints above.

## 7. Run the full public audit from your computer

From the original repository on your own computer, run:

```bash
BASE_URL=https://api.YOURDOMAIN.com npm run test:judge
```

This runs 46 checks including public cases, new language/energy edge cases, Swagger, validation, infeasibility and concurrency. It uses the server's configured OpenAI credential. Share the new public URL for independent checking, and repeat access from a different network. Test the first request after an idle period as well as warm requests; shared hosting may recycle idle processes.

Only after the public audit passes, update `docs/submission.md` and README with the new base URL and the compatibility profile used. Keep the existing public service available until that check is complete. The published Docker image remains a separate fallback; changing this hosting target does not update its immutable digest.

## Troubleshooting

| Symptom | Next check |
|---|---|
| Placeholder page or 404 at `/health` | Application URL/path, startup `app.js`, directory nesting, and restart |
| Passenger error / 503 | Read the configured Passenger log in File Manager; confirm successful dependency install and `dist/main.js` exists |
| `OPENAI_KEY_MISSING` | Save `OPENAI_API_KEY` in this application's environment and restart |
| `OPENAI_AUTH_FAILED` | Correct the key/model access and restart |
| `OPENAI_RATE_LIMIT` | Check provider quota and rate limits |
| `LLM_UNAVAILABLE` | Ask support to check outbound HTTPS/DNS to `api.openai.com` and request timeouts |
| Timeout / resource-limit error | Ask support about memory/CPU/process limits, at least 30-second request handling, and idle recycling |
| Browser SSL warning | Finish certificate issuance and verify the subdomain DNS |

Useful support request: “Please confirm Node.js 20.20.2 with Passenger is enabled for my `gridwise` application, npm dependency installation works through the panel, outbound HTTPS to api.openai.com is allowed, and requests can run for at least 30 seconds. Please tell me the idle process policy and enable Node.js 24 if available.” Do not send support your OpenAI key in a ticket.

## Rebuild the upload on your computer

From the root repository, with Node/npm, internet access and `zip` installed:

```bash
npx --yes --package=node@20.20.2 -c 'node scripts/package-dianahost.cjs --live'
```

This creates a fresh staging directory, performs an engine-strict install from the profile lockfile, builds and runs the offline suite, audits production dependencies, and runs the real OpenAI judge audit before making the archive. `--live` reads your root `.env` only at test time and spends API credits; it never adds that file to the archive. Omitting `--live` skips live verification and records that fact in `BUILD-INFO.json`. Every rebuild includes current source; repeat public testing after an upload.

References: [CloudLinux Node.js Selector](https://docs.cloudlinux.com/cloudlinuxos/lve_manager/#node-js-selector-client-plugin), [Passenger reverse port binding](https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html), [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs), [Node.js lifecycle](https://nodejs.org/en/about/previous-releases).

# Create accounts and deploy

**The current live public service runs on DianaHost cPanel hosting.** Follow [the cPanel upload guide](dianahost.md) and its separate Node.js 20.20.2 compatibility profile to deploy or update it. The sections below (GitHub, Render, Docker Hub) remain as a fully reproducible alternative path — useful if you want a Docker-based host instead of shared cPanel hosting, or as a backup.

Complete these steps in your own accounts. Do not share passwords or keys in chat. Record final URLs in `docs/submission.md`.

## 1. GitHub repository

Create a GitHub account, then open [New repository](https://github.com/new). Name it `gridwise`, choose **Private**, and leave initialization options unchecked. Create it after question reveal; keep it private during the event and switch to public after the organizers' deadline. See [GitHub&#39;s instructions](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

Replace `YOUR_ACCOUNT` in these commands:

```bash
git init -b main
git add .
git status --short
git check-ignore .env
git diff --cached --name-only
git commit -m "Implement GridWise LLM interpretation and optimal scheduling"
git remote add origin https://github.com/YOUR_ACCOUNT/gridwise.git
git push -u origin main
```

Confirm `.env` is ignored and absent from the staged files. Authenticate through GitHub's credential flow; do not put a token in the remote URL. If already inside a repository, inspect existing configuration instead of repeating initialization. No remote repository has been created automatically.

## 2. Deploy one API service (reproducibility target)

This step is optional: it reproduces the API as a Docker-based Render deployment, kept here for portability and as evidence the codebase isn't tied to one host. The service actually submitted is the DianaHost deployment from the note above.

Create an account at [Render](https://dashboard.render.com/) and connect GitHub with access to this private repository. Choose **New → Web Service**, select the repository, choose **Docker** as language/runtime, and set the Dockerfile path to `./Dockerfile`. Leave the custom Docker command blank. Render supports building directly from a repository's Dockerfile. [Official Docker deployment instructions](https://render.com/docs/docker).

Add these service environment settings:

```text
OPENAI_API_KEY = your actual key (secret environment value)
OPENAI_MODEL = gpt-4.1-mini-2025-04-14
PORT = 3000
OPENAI_TIMEOUT_MS = 11000
OPENAI_MAX_ATTEMPTS = 2
```

Set the health-check path to `/health`, choose an available region and service plan, then deploy. No database or second service is needed. The app binds to `0.0.0.0` and respects `PORT`. Submit the generated HTTPS base URL.

Choose hosting that stays running during evaluation. Render free web services can spin down after inactivity, adding cold-start delay; check [current free-service limits](https://render.com/docs/free) and your account's prices before choosing a paid plan. No paid resource has been created for you.

```bash
curl --fail-with-body https://YOUR-SERVICE.onrender.com/health
BASE_URL=https://YOUR-SERVICE.onrender.com npm run test:samples
```

Open `/docs` on the public URL to verify Swagger. Repeat tests from a second machine or mobile network. Local tests do not establish public reachability. Keep the service and OpenAI quota/model available throughout judging.

## 3. Publish the Docker fallback

Create a [Docker Hub account](https://hub.docker.com/) and a repository named `gridwise`. Judges need pull access without manual help; ensure the final image is pullable during evaluation. See [Docker&#39;s build-and-share guide](https://docs.docker.com/get-started/tutorials/run-an-app/).

Replace `YOUR_DOCKERHUB_ACCOUNT` below:

```bash
docker login
docker build --platform linux/amd64 -t YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0 .
docker push YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
docker pull --platform linux/amd64 YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
docker run --rm --platform linux/amd64 -p 3000:3000 --env-file .env -e PORT=3000 \
  YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
```

`linux/amd64` supports typical judge servers even when developing on Apple Silicon. Docker must support emulation for this build. On Apple Silicon (or any arm64 host), the `--platform linux/amd64` flag on `docker pull` is required, not optional — a plain `docker pull` tries to match the host's native arm64 and fails with "no matching manifest" since only an amd64 image was pushed. Judge servers are typically amd64 already, so they don't need this flag; it's for local verification on an arm64 dev machine. If Buildx is installed, publish both architectures instead so a plain `docker pull` works everywhere:

```bash
docker buildx create --use --name gridwise-builder
docker buildx build --platform linux/amd64,linux/arm64 \
  -t YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0 --push .
```

Run the README's health and sample tests against the pulled image. Record its immutable digest:

```bash
docker image inspect YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0 \
  --format '{{index .RepoDigests 0}}'
```

Submit the exact registry tag and preferably digest. The local name `gridwise:1.0.0` alone is not a registry artifact. Inject keys at runtime with `--env-file`; never put secrets in image builds. Stop an existing host service before using the same port.

## 4. Video and final submission

Watch `deliverables/gridwise-solution.mp4`, confirm that it accurately explains your solution, and upload it to the organizer's accepted location. The narration is synthetic and does not claim a team identity. You may replace it with your own narration using the script. Verify duration is at most 180 seconds and the link opens without requesting access.

Complete `docs/submission.md`. Make the repository public after the deadline. Retain the API, repository, fallback image and video throughout evaluation. The video is mandatory even though it affects only tie-breaks.

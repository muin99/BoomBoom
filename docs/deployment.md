# Create accounts and deploy

Complete these steps in your own accounts. Do not share passwords or keys in chat. Record final URLs in `docs/submission.md`.

## 1. GitHub repository

Create a GitHub account, then open [New repository](https://github.com/new). Name it `gridwise`, choose **Private**, and leave initialization options unchecked. Create it after question reveal; keep it private during the event and switch to public after the organizers' deadline. See [GitHub's instructions](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

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

## 2. Deploy one API service

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

Create a [Docker Hub account](https://hub.docker.com/) and a repository named `gridwise`. Judges need pull access without manual help; ensure the final image is pullable during evaluation. See [Docker's build-and-share guide](https://docs.docker.com/get-started/tutorials/run-an-app/).

Replace `YOUR_DOCKERHUB_ACCOUNT` below:

```bash
docker login
docker build --platform linux/amd64 -t YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0 .
docker push YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
docker pull YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
docker run --rm --platform linux/amd64 -p 3000:3000 --env-file .env -e PORT=3000 \
  YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
```

`linux/amd64` supports typical judge servers even when developing on Apple Silicon. Docker must support emulation for this build. If Buildx is installed, publish both architectures instead:

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

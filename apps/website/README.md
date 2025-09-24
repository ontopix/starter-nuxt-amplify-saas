# Ontopix Website

## Bootstrap

```bash
git clone https://github.com/ontopix/web
cd Web
pnpm install
```
Some of the dependencies may require build-scripts, and when using pnpm, it will suggest to install them. Just follow the instructions.

You will (should) get a warning like this:

> Ignored build scripts: @parcel/watcher, @tailwindcss/oxide, better-sqlite3, esbuild, sharp, vue-demi.
> Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.

The minimum required to build is `sharp`. The rest are optional, appareantly.

```bash
pnpm approve-builds
```
## Run the development server

```bash
pnpm run dev
```

## Build

Build the site creates the static files in the `.output/public` directory.

```bash
pnpm run build
```

## Generate

Generate the static files in the `.output/public` directory.

> This produces static files in the `.output/public` directory. And is a more reliable approach to deploy to GitHub Pages.

```bash
pnpm run generate
```

## Run in production

This must be done after successful build.

```bash
npx serve .output/public
```

## Docker / Podman Makefile Usage

This project includes a **Makefile** to streamline building, running, and publishing Docker/Podman images for both the **static site** (Nuxt generate + Nginx) and the **Nitro server** (full dynamic Nuxt).

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (with Buildx enabled) or [Podman](https://podman.io/).
- A valid **Nuxt UI Pro license key**.

### Environment variables
Before building, export the required variables:

```bash
# Nuxt UI Pro license key (required for build)
export NUXT_UI_PRO_LICENSE=xxxxx-xxxxx

# Target container registry (required for push)
export REGISTRY=registry.ontopix.ai
```

Optional variables:

`ARCH` → target architecture (amd64 or arm64).
If omitted, the native architecture of your machine will be used.
Images will be tagged with a suffix like `:static-amd64` or `:nitro-arm64`.

### Build images

Build the static and Nitro images for your target architecture:

```bash
# Static (Nuxt generate + Nginx)
make build.docker.static ARCH=amd64

# Nitro (full Nuxt server)
make build.docker.nitro ARCH=amd64
```

This produces local images:
- `ontopix/web:static-amd64`
- `ontopix/web:nitro-amd64`

### Run images locally
```bash
# Run static site on http://localhost:8080
make run.docker.static ARCH=amd64

# Run Nitro server on http://localhost:3080
make run.docker.nitro ARCH=amd64
```

### Push images to the registry
```bash
# Tag and push static image
make push.docker.static ARCH=amd64

# Tag and push Nitro image
make push.docker.nitro ARCH=amd64
```

Images will be pushed as:
- `[registry]/ontopix/web:static-amd64`
- `[registry]/ontopix/web:nitro-amd64`

### Pull and run images on the server

On your target Linux server (amd64 in this example):

```bash
# Login once
docker login [registry]
# or
podman login [registry]

# Pull images
docker pull [registry]/ontopix/web:static-amd64
docker pull [registry]/ontopix/web:nitro-amd64

# Run static site on port 8080
docker run -d --name ontopix-static -p 8080:8080 \
  [registry]/ontopix/web:static-amd64

# Run Nitro server on port 3000
docker run -d --name ontopix-nitro -p 3000:3000 \
  [registry]/ontopix/web:nitro-amd64
```

### Other useful Makefile targets

- `make stop.docker.static` → stop the static container.
- `make stop.docker.nitro` → stop the Nitro container.
- `make logs.static` → tail logs for the static container.
- `make logs.nitro` → tail logs for the Nitro container.
- `make clean.images` → remove local images.

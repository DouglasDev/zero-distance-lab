# Codex React Phaser Template

A reusable front-end starter with React, Linaria, Phaser, TypeScript, and Vite. It contains a small generic page and an animated Phaser canvas to verify that the libraries work together.

## Start a new project

Copy the tracked files into a new folder under `~/code` without copying this template's `.git` directory. Replace `my-project` with your project's name:

```sh
mkdir ~/code/my-project
git -C ~/code/codex-react-phaser-template archive HEAD | tar -x -C ~/code/my-project
cd ~/code/my-project
pnpm pkg set name=my-project
pnpm install --frozen-lockfile
git init -b main
pnpm run typecheck
git add .
git commit -m "Initialize project from template"
pnpm run dev
```

## Checks

```sh
pnpm run typecheck
pnpm run build
```

`pnpm run build` also runs the TypeScript check. The example React UI is in `src/App.tsx`, the Linaria styles are colocated there, and `src/PhaserCanvas.tsx` shows how to mount and clean up a Phaser game from React. Replace those example components for your project; keep the configuration and dependencies you need.

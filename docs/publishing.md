# Repository and publishing

Recorded on 2026-09-06.

This standalone repository is the primary source for future Fishslop updates.
The earlier `fishslop/` directory in the `DingGengJia/code` repository is a historical
copy; pushing there does not publish this GitHub Pages website. The two repositories
do not synchronize automatically.

| Item | Value |
| --- | --- |
| Repository | https://github.com/DingGengJia/fishslop |
| Git remote | `git@github.com:DingGengJia/fishslop.git` |
| Branch | `main` |
| Live game | https://dinggengjia.github.io/fishslop/ |
| Workflow | `.github/workflows/pages.yml` — Deploy GitHub Pages |
| Pages source | GitHub Actions |
| Build base | `/fishslop/` |

## Update

Work from a clone of this standalone repository. Before editing, check the working
tree and remote; preserve any existing local changes.

```sh
git status --short
git remote -v
git pull --ff-only origin main
npm ci
# Edit the game, assets, or documentation.
npm test
npm run build -- --base=/fishslop/
git add <changed-files>
git diff --cached --check
git commit -m "Describe the update"
git push origin main
```

A push to `main` triggers tests, a production build, and deployment. Wait for
**Deploy GitHub Pages** to succeed in the repository's Actions tab, then open the
HTTPS game and check scene/model loading. A successful push alone does not prove
a successful deployment. To retry a deployment without changing code, use the
workflow's **Run workflow** control with branch `main`.

The workflow publishes `dist/` after excluding `.blend` and `.blend1` files.
Editable models remain versioned in the source repository. Do not commit
`node_modules/`, `dist/`, credentials, or local recording artifacts.

## Migration notes

Initial standalone source commit: `eb6eae29bbd311827313ef72386b8c09a496a838`.
The initial deployment passed 25 tests, built successfully, and was checked in a
browser. HTML, CSS, JavaScript, and the four lite GLB models matched the local
build by SHA-256.

VPS hosting is separate and is not updated by this workflow. Existing VPS browser
saves do not automatically move to the Pages origin. The old local checkout may
contain recording tools and videos that were not included in this repository;
move individual needed files deliberately instead of overwriting the standalone
checkout with the entire old folder.

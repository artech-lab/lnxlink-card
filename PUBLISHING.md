# Publishing on GitHub and HACS

Maintainer notes: the steps to publish the card and get it into the HACS default store.

## The easiest way: VS Code + Claude Code

1. Open this folder in VS Code and install the recommended extensions (VS Code suggests them itself:
   **Claude Code** is one of them).
2. Install [GitHub CLI](https://cli.github.com/) and log in once with `gh auth login`.
3. Open Claude Code and type `/publish` (or `/publish your-username`).

Claude Code runs steps 1-4 of this guide (placeholder, tests, repository, release), checks that the HACS
validation is green and asks for confirmation before opening the request for the HACS store (step 6). For
later versions use `/release X.Y.Z`. The project rules Claude Code follows are in [`CLAUDE.md`](CLAUDE.md).

If you prefer to do everything by hand, follow the steps below.

## 1. Insert your GitHub username

In the files the repository owner is the placeholder `GITHUB_USER`. Replace it with your username (or the
organization) from the project folder.

Git Bash (included in Git for Windows), Linux or macOS:

```bash
grep -rl GITHUB_USER . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude \
  --exclude=PUBLISHING.md --exclude=CLAUDE.md | xargs sed -i 's/GITHUB_USER/your-username/g'
```

PowerShell 7:

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\(\.git|\.claude|node_modules)\\' -and
    $_.Name -notin 'PUBLISHING.md', 'CLAUDE.md' } |
  Select-String -Pattern GITHUB_USER -List | ForEach-Object {
    (Get-Content $_.Path -Raw) -replace 'GITHUB_USER', 'your-username' |
      Set-Content $_.Path -NoNewline -Encoding utf8NoBOM }
```

Check: the same `grep -rn GITHUB_USER` with the same exclusions must find nothing (this file, `CLAUDE.md`
and the commands in `.claude/` keep the placeholder only in the instructions).

## 2. Create the repository

1. On GitHub create a **public** repository named `lnxlink-card` (without README, license or
   .gitignore: they are already here).
2. Upload the files:

   ```bash
   git init -b main
   git add .
   git commit -m "LNXlink Card 1.0.0"
   git remote add origin https://github.com/your-username/lnxlink-card.git
   git push -u origin main
   ```

3. On the repository page, gear next to **About**:
   - description: `Home Assistant card for Linux computers monitored with LNXlink: status, CPU and RAM charts, storage, network, updates and power buttons`
   - topics: `home-assistant`, `hacs`, `lovelace`, `lovelace-card`, `custom-card`, `dashboard`,
     `lnxlink`, `linux`, `system-monitor`, `mqtt`
4. In **Settings > General > Features** keep **Issues** enabled (HACS requires it).

## 3. Check the validation

In the **Actions** tab the **Validate** workflow must be green: it contains the official HACS validation and
the unit tests. If the HACS validation reports the description or the topics, complete them and rerun the
workflow (Run workflow).

## 4. Create the first release

**Releases > Draft a new release**: tag `v1.0.0` (created on publish), title `1.0.0`, the 1.0.0 section of
`CHANGELOG.md` as notes, then **Publish release** (a full release is needed, a tag alone is not enough). The
**Release** workflow checks that the tag matches the card version and attaches `lnxlink-card.js`
to the release.

## 5. Try it on a Home Assistant instance

1. HACS > ⋮ > Custom repositories > add the repository URL with type **Dashboard**, then download the card.
2. If the card was already installed by hand on that instance (file in `/local/` or inline resource),
   delete that resource from Settings > Dashboards > Resources: only
   `/hacsfiles/lnxlink-card/lnxlink-card.js` must remain.
3. Reload the browser clearing the cache and add the card (`type: custom:lnxlink-card`) with no
   other options: it must find the LNXlink computer and all its sensors on its own, with the CPU and RAM
   charts of the last hours. With the computer off it shows "Offline" and disabled power buttons.
4. In the browser console (F12) you must see `LNXLINK-CARD v1.0.0` and no warning about duplicate
   copies.
5. If a card of an earlier inline version was on the dashboard (other tag), replace it with
   `type: custom:lnxlink-card` and keep its visibility conditions.

## 6. Get into the HACS default store

Until it is accepted, the card installs as a custom repository. The default store is the same one that from
Home Assistant 2026.11 is built in as the **Marketplace**. Requirements for inclusion (HACS documentation,
*Publish > Include default repositories*):

- public, non-archived repository with description, topics and issues enabled;
- `hacs.json` and README present, at least one published release;
- the HACS **Validate** action passing with no exclusions;
- a license recognized by GitHub and OSI approved (GPL-3.0 is);
- images in the README (*images* check, mandatory for cards);
- the request must come from the owner or a main contributor, not from an organization account.

Then:

1. fork [hacs/default](https://github.com/hacs/default) and create a new branch from `master`;
2. in the `plugin` file add the line `your-username/lnxlink-card` keeping the alphabetical order;
3. open the pull request filling in the proposed template and wait for the review (and the automated
   checks).

## 7. Later releases

With Claude Code: `/release X.Y.Z`. By hand:

1. Update `LNC_VERSION` in `dist/lnxlink-card.js`, `version` in `package.json` and `CHANGELOG.md`
   (the `Unreleased` section becomes the new version).
2. `npm test` (and, if you have Playwright, `npm run test:e2e`; `npm run screenshots` if the look changed).
3. Commit, push and a new release with tag `vX.Y.Z`: HACS will offer the update to users.

import { AuthError, checkRepo } from '../github/api';
import { DEFAULT_REPO, clearGhConfig, guessRepo, loadGhConfig, saveGhConfig, type GhConfig } from '../github/config';
import { planUpload, projectExists, uploadProject } from '../github/addProject';
import { loginWithPassword, saveLoginPassword } from '../github/login';
import { WrongPasswordError, passwordProblem } from '../github/vault';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}
const field = (label: string, input: HTMLInputElement | HTMLTextAreaElement, hint?: string) =>
  el('label', { className: 'field' }, el('span', {}, label), input, ...(hint ? [el('small', {}, hint)] : []));

function modal(title: string): { dlg: HTMLDialogElement; body: HTMLElement; close(): void } {
  const dlg = el('dialog', { className: 'dialog' });
  const body = el('div');
  const x = el('button', { type: 'button', className: 'close', textContent: '×' });
  x.setAttribute('aria-label', 'Close');
  dlg.append(x, el('h2', { textContent: title }), body);
  document.body.append(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  x.addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.showModal();
  return { dlg, body, close };
}

// GitHub token stays in this browser only; the connection is checked before saving
export function openSettings(onChange: () => void): void {
  const { body, close } = modal('Settings – GitHub');
  const cur = loadGhConfig();
  const guess = guessRepo(location.href);
  const owner = el('input', { value: cur?.owner ?? guess?.owner ?? DEFAULT_REPO.owner, required: true });
  const repo = el('input', { value: cur?.repo ?? guess?.repo ?? DEFAULT_REPO.repo, required: true });
  const branch = el('input', { value: cur?.branch ?? DEFAULT_REPO.branch, required: true });
  const token = el('input', { type: 'password', value: cur?.token ?? '', placeholder: 'github_pat_…', autocomplete: 'off', required: true });
  const status = el('p', { className: 'status' });
  const save = el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Save and check' });
  const remove = el('button', { type: 'button', className: 'btn', textContent: 'Log out on this device' });
  const form = el('form', {},
    el('p', { className: 'lead', textContent: 'The token lets the app save changes (layers, new projects) as commits to the repository. It is stored only in this browser.' }),
    field('Token (fine-grained, Contents: Read and write)', token),
    el('details', {}, el('summary', { textContent: 'Repository' }), field('Owner', owner), field('Repository', repo), field('Branch', branch)),
    status, el('div', { className: 'actions' }, save, ...(cur ? [remove] : [])));
  body.append(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg: GhConfig = { owner: owner.value.trim(), repo: repo.value.trim(), branch: branch.value.trim(), token: token.value.trim() };
    save.disabled = true; status.className = 'status'; status.textContent = 'Checking…';
    try {
      await checkRepo(cfg);
      saveGhConfig(cfg);
      status.className = 'status ok'; status.textContent = `Connected to ${cfg.owner}/${cfg.repo}.`;
      onChange();
      setTimeout(close, 900);
    } catch (err) {
      status.className = 'status err';
      status.textContent = err instanceof Error ? err.message : String(err);
      if (!(err instanceof AuthError) && (err as Error).name === 'TypeError') status.textContent = 'Cannot reach GitHub';
    } finally { save.disabled = false; }
  });
  remove.addEventListener('click', () => { clearGhConfig(); onChange(); close(); });
  if (cur) body.append(passwordSection(cur));
}

// password login: encrypts the current token with a password and commits public/login.json
function passwordSection(cfg: GhConfig): HTMLElement {
  const pass = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'at least 12 characters' });
  const again = el('input', { type: 'password', autocomplete: 'new-password' });
  const status = el('p', { className: 'status' });
  const save = el('button', { type: 'submit', className: 'btn', textContent: 'Save login password' });
  const form = el('form', { className: 'password-login' },
    el('h3', { textContent: 'Password login for other devices' }),
    el('p', { className: 'lead', textContent: 'Encrypts this token with a password and publishes it with the site. On another device just click “Log in” and enter the password. Use a long password (4–5 random words) – the encrypted token is public.' }),
    field('Password', pass), field('Repeat password', again), status, el('div', { className: 'actions' }, save));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const problem = passwordProblem(pass.value) ?? (pass.value !== again.value ? 'The passwords do not match' : null);
    if (problem) { status.className = 'status err'; status.textContent = problem; return; }
    save.disabled = true; status.className = 'status'; status.textContent = 'Encrypting and saving…';
    try {
      await saveLoginPassword(cfg, pass.value);
      status.className = 'status ok';
      status.textContent = 'Saved. “Log in” will work on other devices after the site rebuilds (about 2 minutes).';
      pass.value = ''; again.value = '';
    } catch (err) {
      status.className = 'status err'; status.textContent = err instanceof Error ? err.message : String(err);
    } finally { save.disabled = false; }
  });
  return form;
}

export function openLogin(onChange: () => void): void {
  const { body, close } = modal('Log in');
  const pass = el('input', { type: 'password', autocomplete: 'current-password', required: true });
  const status = el('p', { className: 'status' });
  const go = el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Log in' });
  const form = el('form', {}, field('Password', pass), status, el('div', { className: 'actions' }, go));
  body.append(form);
  pass.focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    go.disabled = true; status.className = 'status'; status.textContent = 'Checking…';
    try {
      const cfg = await loginWithPassword(pass.value);
      await checkRepo(cfg);
      status.className = 'status ok'; status.textContent = `Logged in – saving to ${cfg.owner}/${cfg.repo}.`;
      onChange();
      setTimeout(close, 700);
    } catch (err) {
      status.className = 'status err';
      status.textContent = err instanceof WrongPasswordError ? 'Wrong password'
        : err instanceof AuthError ? `${err.message} – the token may have expired; paste a new one in Settings and set the password again`
        : err instanceof Error ? err.message : String(err);
      if (!(err instanceof WrongPasswordError)) clearGhConfig();
      onChange();
    } finally { go.disabled = false; }
  });
}

// new project from a .rb / model.json / project.ts file → commit to projects/<id>/, built by GitHub Actions
export function openAddProject(cfg: GhConfig): void {
  const { body, close } = modal('Add project');
  const id = el('input', { required: true, pattern: '[a-z0-9][a-z0-9\\-]*', placeholder: 'e.g. hallway-cabinet' });
  const name = el('input', { required: true, placeholder: 'e.g. Hallway cabinet' });
  const desc = el('textarea', { rows: 2 });
  const file = el('input', { type: 'file', accept: '.rb,.json,.ts', required: true });
  const status = el('p', { className: 'status' });
  const send = el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Send to repository' });
  const form = el('form', {},
    field('Id (URL and part code prefix)', id, 'lowercase letters, digits, hyphens'),
    field('Name', name), field('Description', desc),
    field('File', file, 'SketchUp script .rb, model.json or project.ts'),
    status, el('div', { className: 'actions' }, send));
  body.append(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = file.files?.[0];
    if (!f) return;
    const plan = planUpload(id.value.trim(), f.name, await f.text(), { name: name.value.trim(), description: desc.value.trim() });
    if ('error' in plan) { status.className = 'status err'; status.textContent = plan.error; return; }
    send.disabled = true; status.className = 'status'; status.textContent = 'Sending…';
    try {
      const keeps = /\.(rb|json)$/i.test(f.name)
        ? 'Manual layers and part codes are kept (merged by part name).'
        : 'Note: project.ts keeps its own part codes (codes.json) – codes from the current model.json will not carry over.';
      if (await projectExists(cfg, id.value.trim()) && !confirm(`Project "${id.value.trim()}" already exists – replace its source? ${keeps}`)) {
        status.textContent = ''; return;
      }
      await uploadProject(cfg, id.value.trim(), plan.files);
      status.className = 'status ok';
      status.replaceChildren('Sent. The site will rebuild in about 2 minutes – ',
        el('a', { href: `https://github.com/${cfg.owner}/${cfg.repo}/actions`, target: '_blank', rel: 'noopener', textContent: 'progress in GitHub Actions' }), '.');
      form.querySelectorAll('input,textarea,button[type=submit]').forEach((x) => ((x as HTMLInputElement).disabled = true));
    } catch (err) {
      status.className = 'status err'; status.textContent = err instanceof Error ? err.message : String(err);
    } finally { if (status.className !== 'status ok') send.disabled = false; }
  });
  void close;
}

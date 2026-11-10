# RBD — Reliability Block Diagram

> **Status:** early design stage, not runnable. The page is a three-panel interface shell (library, canvas, analysis) with static sample content.

## The HFA tools

Human Factors Analysis (HFA) tools for safety and human factors work. Each tool is a separate repository and runs in the browser without installation, a server or an account. Nothing leaves the browser unless you export it, and the tools also work in isolated (air-gapped) environments through their single-file offline versions. All tools are under development; file formats may change.

| Tool | What it does | Links |
|---|---|---|
| **HTA** | Hierarchical Task Analysis with Tabular Task Analysis (TTA / HEI fields): a task tree and a linked table, JSON and CSV export. | [Open](https://larswpettersson.github.io/hfa-hta/HTA.html) · [offline file](https://larswpettersson.github.io/hfa-hta/hta_offline.html) · [repository](https://github.com/larswpettersson/hfa-hta) |
| **Bowtie** | Bowtie diagrams: causes, preventive and reactive barriers, top event and consequences, with printing to one A4 page. | [Open](https://larswpettersson.github.io/hfa-bowtie/Bowtie.html) · [offline file](https://larswpettersson.github.io/hfa-bowtie/Bowtie_offline.html) · [repository](https://github.com/larswpettersson/hfa-bowtie) |
| **STPA Workbench** | System-Theoretic Process Analysis: a control-structure diagram built directly in the diagram, tables for losses, hazards, unsafe control actions and safety constraints, and optional AI support. | [Open](https://larswpettersson.github.io/hfa-stpa/workbench/) · [offline file](https://larswpettersson.github.io/hfa-stpa/workbench/stpa_offline.html) · [repository](https://github.com/larswpettersson/hfa-stpa) |
| **RBD (Reliability Block Diagram) *(this repository)*** | Reliability block diagrams. Early design stage, not runnable yet. | [repository](https://github.com/larswpettersson/hfa-rbd) |
| **HFA DS** | The design system: design tokens, the Penpot library, the design principles and the shared automated tests. Contains no runnable application. | [repository](https://github.com/larswpettersson/hfa-ds) · [architecture](https://github.com/larswpettersson/hfa-ds/blob/main/docs/ARCHITECTURE.md) · [design principles](https://github.com/larswpettersson/hfa-ds/blob/main/docs/design-principles.md) |

The AI support in the tools is optional. With a local model (Ollama, LM Studio, LocalAI) no data leaves the computer; a cloud provider (Claude, Gemini, Hugging Face) receives the analysis and any attached image. The full picture is in the [architecture](https://github.com/larswpettersson/hfa-ds/blob/main/docs/ARCHITECTURE.md).

## Files

- [`RBD.html`](RBD.html) — the interface shell
- [`styles/rbd.css`](styles/rbd.css) and [`scripts/rbd-app.js`](scripts/rbd-app.js)
- Design tokens come from [hfa-ds](https://github.com/larswpettersson/hfa-ds); they are not stored here.

## License

[MIT](LICENSE)

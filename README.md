# Cinematografia para Web Criativa 🎬

Curso interativo de vocabulário de cinema pra quem já manda bem em three.js e GSAP. Cada termo vem com analogia, demo no sandbox 3D e o código que muda.

- `index.html`: casca da página (three.js e GSAP via CDN)
- `css/`: base, curso, sandbox e um arquivo por módulo em `css/modules/`
- `js/main.js`: entrada; `js/sandbox/`: cena, palco e movimentos de câmera
- `js/modules/module-N.js`: um arquivo por módulo (2–6 ainda são placeholders)
- `spec.md`: a spec que guia o conteúdo e as regras de ensino

## Rodar

Precisa de servidor (ES modules não carregam via `file://`):

```sh
npx serve .
```

## Status

- [x] Módulo 1: a câmera se move
- [ ] Módulos 2–6 (depois do feedback do módulo 1)

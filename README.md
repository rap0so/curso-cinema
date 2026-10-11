# Cinematografia para Web Criativa 🎬

Curso interativo de vocabulário de cinema pra quem já manda bem em three.js e GSAP. Cada termo vem com analogia, demo no sandbox 3D e o código que muda.

- `index.html`: casca da página (three.js e GSAP via CDN)
- `css/`: base, curso, sandbox; `css/modules/` só pros módulos com UI própria (4, 5, 6)
- `js/main.js`: entrada e navegação
- `js/lesson.js`: kit comum dos módulos (pergunta inicial, termos, cola, quiz, desafio, achievement)
- `js/sandbox/`: cena, palco (viewports, DOF, readout), movimentos, framing e rig de luz
- `js/modules/module-N.js`: conteúdo e demos de cada módulo
- `spec.md`: a spec que guia o conteúdo e as regras de ensino

## Rodar

Precisa de servidor (ES modules não carregam via `file://`):

```sh
npx serve .
```

## Status

- [x] Módulo 1: a câmera se move
- [x] Módulo 2: a lente
- [x] Módulo 3: composição
- [x] Módulo 4: luz
- [x] Módulo 5: ritmo e montagem
- [x] Módulo 6: storyboard e shot list

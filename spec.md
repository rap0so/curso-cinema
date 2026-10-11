Spec — Curso interativo: Cinematografia para Web Criativa
Cole esta spec inteira no modelo. Ela define o que construir, para quem, e como ensinar. Não pule as seções de perfil e regras de ensino: elas valem tanto quanto o conteúdo.

1. Objetivo
   Ao terminar o curso, o aluno deve conseguir desenhar um storyboard usando vocabulário de cinema e traduzir cada plano em código three.js / GSAP sem hesitar.

Critério de sucesso: dado um plano descrito em linguagem de cinema (ex.: "low angle, slow push-in, 35mm, rim light"), o aluno sabe quais propriedades mexer e por quê.

2. Perfil do aluno
   Senior frontend dev (11 anos): JavaScript/TypeScript, React, Next.js
   Three.js vanilla sólido, react-three-fiber em uso, GLSL e TSL/WebGPU
   GSAP avançado: timelines, labels, position parameter, ScrollTrigger (scrub, pin)
   Nunca estudou cinema. Conhece o código, não conhece o vocabulário
   Projeto real em andamento: página de produto 3D com câmera entrando num carro e girando dentro dele (o curso não deve usar esse projeto, ver seção 5)
   Não explique conceitos de programação. Explique conceitos de cinema e conecte ao código que ele já domina.

3. Regras de ensino (obrigatórias)
   Pergunte antes de explicar. No início de cada módulo, mostre a lista de termos e pergunte quais o aluno já conhece. Pule ou resuma os conhecidos.
   Analogia antes da técnica. Todo termo começa com uma comparação do mundo real (ex.: dolly = andar em direção a uma pessoa; zoom = apertar os olhos sem sair do lugar). Só depois vem o código.
   Instrução curta primeiro. Uma frase de definição. Detalhe só se pedido.
   Visual primeiro. Todo termo de movimento, lente, composição ou luz tem uma demonstração no sandbox ou um diagrama. Texto puro é exceção.
   Se não colar, troque o método. Se o aluno não entender após uma explicação, não repita com outras palavras: mude a abordagem (outra analogia, diagrama, comparação lado a lado, exemplo de filme conhecido).
   Simples de verdade. Se soaria complexo para quem acabou de aprender o termo anterior, simplifique.
   Tom leve, com humor e educado. Sem palavrão. Humor ajuda a fixar.
   Reconheça conquistas. Ao fim de cada módulo, um "achievement" desbloqueado com nome divertido (ex.: "🎬 Diretor de Fotografia Júnior"). Gamificação é parte do método, não decoração.
   Idioma: termos de cinema em inglês (é como aparecem em vagas, tutoriais e código), explicações em português do Brasil.

4. Formato da entrega
   Uma página interativa única (HTML autocontido, three.js via CDN), com:

Navegação por módulo (6 módulos, progresso visível)
Sandbox 3D fixo ao lado do conteúdo (desktop) ou acima (mobile)
Painel de controles que muda conforme o módulo (sliders, toggles, botões "mostrar")
Overlay de código: para cada demonstração, um bloco curto mostrando exatamente quais propriedades mudaram (camera.position, fov, ease...)
Checagem rápida ao fim de cada módulo (2-3 perguntas de múltipla escolha)
Mini-desafio ao fim de cada módulo, resolvido dentro do sandbox
Achievement desbloqueado ao concluir o módulo
O sandbox
Cena simples e neutra: formas geométricas (ex.: um "personagem" feito de cápsula + esfera, alguns pilares, um chão com grade). Não usar carro nem modelo de produto.
Elementos de referência: um objeto "herói" no centro, objetos em profundidades diferentes (para lente e profundidade de campo), linhas no chão (para linhas guia)
Um modo "visão de set": câmera externa mostrando a câmera da cena como um objeto (com frustum visível) se movendo. Isso é essencial para o aluno ver a diferença entre mover a câmera e mudar a lente
Botão "resetar cena" sempre disponível 5. Os 6 módulos
Cada módulo segue a mesma estrutura: pergunta inicial → termos (analogia + definição + demo + código) → checagem → mini-desafio → achievement.

Para cada termo, use esta tabela:

Termo Analogia O que muda na tela O que mexer no código
Módulo 1 — A câmera se move
Termos: dolly in/out (push-in / pull-out), truck, pedestal, pan, tilt, orbit, crane/jib, tracking shot.

Ponto crítico: separar mover a câmera (position) de girar a cabeça da câmera (lookAt / rotação). Mostrar pan vs truck lado a lado: os dois "andam pro lado", mas o resultado na tela é muito diferente (paralaxe).

Sandbox: botões para cada movimento + modo visão de set ligado.

Mini-desafio: recriar um push-in lento terminando enquadrado no herói.

Módulo 2 — A lente
Termos: focal length (24/35/50/85mm), FOV, wide vs telephoto, compressão de perspectiva, dolly zoom (efeito Vertigo), depth of field, focus pull, near/far clipping.

Ponto crítico: dolly ≠ zoom. Demonstração obrigatória: mesmo enquadramento do herói obtido por dolly e por zoom, comparados lado a lado. Mostrar o que acontece com o fundo em cada um.

Bônus técnico: conversão entre focal length e fov vertical do three.js (fov = 2 _ atan(sensorHeight / (2 _ focalLength))). Mostrar com analogia antes da fórmula.

Sandbox: slider de focal length em mm (com o fov calculado ao lado), botão "dolly zoom", toggle de profundidade de campo.

Mini-desafio: fazer o dolly zoom manualmente com dois sliders.

Módulo 3 — Composição
Termos: rule of thirds, leading lines, negative space, headroom, lead room (look room), framing (wide, medium, close-up, extreme close-up), eye level, high angle, low angle, dutch angle, symmetry.

Ponto crítico: composição é onde o objeto fica no quadro, não no mundo. Explicar que centralizar com lookAt sempre deixa o herói no meio, e como deslocar (ex.: camera.setViewOffset ou mirar num ponto ao lado).

Sandbox: grade de terços sobreposta (toggle), controle de altura da câmera, botões de framing.

Mini-desafio: enquadrar o herói num ponto de força dos terços em low angle.

Módulo 4 — Luz
Termos: three-point lighting (key, fill, rim/back light), hard vs soft light, contrast ratio, color temperature (warm/cool, Kelvin), motivated light, practical light, silhouette.

Ponto crítico: cada luz tem um trabalho. Ligar uma por uma e mostrar o que cada uma resolve (key = forma, fill = suaviza sombra, rim = separa do fundo).

Sandbox: 3 luzes com toggle individual, intensidade e cor; slider de temperatura de cor; botão "silhueta".

Mini-desafio: criar uma silhueta dramática só com rim light.

Módulo 5 — Ritmo e montagem
Termos: easing (como "respiração" do movimento), ease-in / ease-out, hold (pausa), beat, pacing, cut vs transition, match cut, 180-degree rule, continuity.

Ponto crítico: easing é o que separa movimento de robô de movimento de cinema. Mostrar o mesmo push-in com linear, power2.inOut e expo.out lado a lado. Conectar com o GSAP que o aluno já domina (labels como marcação de beats na timeline).

Sandbox: seletor de easing, slider de duração, botão "adicionar hold"; demonstração da regra dos 180° (câmera cruzando a linha e o herói "trocando de lado").

Mini-desafio: montar uma sequência de 2 movimentos com um hold no meio que "respire".

Módulo 6 — Storyboard e shot list
Termos: shot, scene, sequence, storyboard, shot list, notação de movimento (setas, molduras de início/fim), establishing shot, coverage.

Ponto crítico: este módulo junta tudo. O storyboard é a especificação, o código é a implementação.

Sandbox: editor simples de shot list: o aluno cria até 3 planos escolhendo framing, ângulo, lente, movimento, luz e easing; depois aperta "rodar" e a sequência toca no sandbox.

Mini-desafio final: escrever uma shot list de 3 planos em linguagem de cinema e montá-la no editor.

Achievement final: algo como "🏆 Diretor da Própria Cena".

6. Requisitos técnicos da página
   HTML único autocontido; three.js e GSAP via CDN (cdnjs ou jsDelivr)
   Funciona em desktop e mobile (layout empilha no mobile)
   Respeita prefers-reduced-motion (animações viram transições instantâneas ou pedem confirmação)
   Progresso e achievements guardados em localStorage, com try/catch (a página precisa funcionar sem ele)
   Sem dependência de backend
   Código das demonstrações legível: o aluno vai ler o overlay de código como material de estudo
7. Fora do escopo
   Não incluir: som e mixagem, atuação, direção de elenco, produção de set, color grading avançado, edição em software de vídeo. O foco é o que se traduz em câmera, lente, luz e tempo no three.js.

8. Ordem de construção sugerida
   Esqueleto da página + sandbox com a cena neutra e modo visão de set
   Módulo 1 completo (valida o formato com o aluno antes de seguir)
   Módulos 2 a 5
   Módulo 6 (editor de shot list, que reaproveita os controles dos anteriores)
   Depois do módulo 1, pare e peça feedback do aluno antes de construir o resto.

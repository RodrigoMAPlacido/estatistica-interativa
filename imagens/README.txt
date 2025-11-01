# Manual de Padronização dos SVGs Animados

Este manual descreve **todas as classes, variáveis e padrões** que usamos para manter **consistência visual e de animação** entre as figuras. A ideia é que qualquer SVG novo “plugue” o mesmo *boilerplate* e funcione da mesma forma, com o mínimo de ajuste local.

---

## 1) Filosofia do padrão

1. **Utilitárias (`u-*`)**: classes puramente visuais/estruturais (traço, espessura, caixa, alinhamento).
2. **Animáveis (`a-*`)**: classes que aplicam *keyframes* padronizados de traçado e preenchimento.
3. **Variáveis CSS (`:root`)**: um pequeno conjunto de variáveis controla paleta, tempo, *easing* e tamanho do *dash*.
4. **Sequenciamento**: use a CSS var `--delay` **inline** em cada elemento/grupo para criar ondas de entrada sem duplicar *keyframes*.
5. **Acessibilidade/UX**: respeitamos `prefers-reduced-motion` — tudo vira estático com boa aparência.

---

## 2) Cabeçalho mínimo (colar no `<defs><style>`)

```css
:root{
  /* paleta/tipo */
  --ink:#111827;
  --font:"et-book","ETBook","Georgia",serif;

  /* tempo/easing unificados */
  --cycle:8s;
  --ease:ease-in-out;

  /* dashes padrão (ajuste se seu traço for muito longo) */
  --dash:900;
  --dashText:700;
}

/* ========== UTILITÁRIAS (u-*) ========== */
text{ font-family:var(--font); fill:var(--ink); user-select:none; letter-spacing:.13px }
.u-stroke{ stroke:var(--ink); fill:none; stroke-linecap:round; stroke-linejoin:round }
.u-box{ stroke-width:3; rx:16 }
.u-thick{ stroke-width:3 }
.u-center{ text-anchor:middle }
.u-bold{ font-weight:700 }

/* tamanhos de texto frequentes */
.u-h{ font-size:34px }
.u-sub{ font-size:18px; opacity:.85 }

/* ========== ANIMAÇÕES (a-*) ========== */
@keyframes k-drawLine{
  0%{ stroke-dashoffset:var(--dash); opacity:0 }
  10%{ opacity:1 } 45%{ stroke-dashoffset:0; opacity:1 }
  55%{ stroke-dashoffset:0; opacity:1 }
  90%{ stroke-dashoffset:var(--dash); opacity:1 }
  100%{ stroke-dashoffset:var(--dash); opacity:0 }
}
.a-draw{
  stroke-dasharray:var(--dash);
  stroke-dashoffset:var(--dash);
  animation:k-drawLine var(--cycle) var(--ease) infinite both;
  animation-delay:var(--delay,0s);
}

@keyframes k-textStroke{
  0%{ stroke-dashoffset:var(--dashText); opacity:0 }
  10%{ opacity:1 } 45%{ stroke-dashoffset:0; opacity:1 }
  55%{ stroke-dashoffset:0; opacity:1 }
  90%{ stroke-dashoffset:var(--dashText); opacity:1 }
  100%{ stroke-dashoffset:var(--dashText); opacity:0 }
}
@keyframes k-textFill{
  0%,18%{ fill:transparent }
  34%,66%{ fill:var(--ink) }
  92%,100%{ fill:transparent }
}
.a-text{
  stroke:var(--ink); stroke-width:.9; stroke-linecap:round; stroke-linejoin:round;
  fill:transparent;
  stroke-dasharray:var(--dashText); stroke-dashoffset:var(--dashText);
  animation:
    k-textStroke var(--cycle) var(--ease) infinite both,
    k-textFill   var(--cycle) var(--ease) infinite both;
  animation-delay:var(--delay,0s), var(--delay,0s);
}

/* acessibilidade */
@media (prefers-reduced-motion:reduce){
  .a-draw,.a-text{ animation:none !important; opacity:1 }
  .a-text{ fill:var(--ink); stroke-dashoffset:0 }
}
```

> Dica: para setas reutilizáveis, defina um `<marker id="arrow">` no `<defs>` e use `marker-end="url(#arrow)"` nas linhas.

---

## 3) Quando usar cada classe

### 3.1 Utilitárias (estruturais/visuais)

* `.u-stroke` — aplica traço padrão (sem preenchimento) com terminais arredondados:

  ```html
  <line x1="100" y1="200" x2="400" y2="200" class="u-stroke"/>
  ```
* `.u-box` — retângulo com borda 3px e `rx:16`:

  ```html
  <rect x="80" y="60" width="400" height="300" class="u-stroke u-box"/>
  ```
* `.u-thick` — reforça espessura (3px) em linhas “tronco/barra”:

  ```html
  <line ... class="u-stroke u-thick"/>
  ```
* `.u-center`, `.u-bold`, `.u-h`, `.u-sub` — tipografia/alinhamento:

  ```html
  <text x="280" y="105" class="u-center u-bold u-h">AMOSTRA</text>
  <text x="280" y="130" class="u-center u-sub">dados observados</text>
  ```

### 3.2 Animáveis (traçado e texto)

* `.a-draw` — anima **traçado de linhas/contornos** (tronco, barra, ramos, setas/“hastes”, etc.):

  ```html
  <line x1="750" y1="170" x2="750" y2="230" class="u-stroke u-thick a-draw" style="--delay:.12s"/>
  <rect x="100" y="280" width="380" height="380" class="u-stroke a-draw" style="--delay:.48s"/>
  ```

  * **Somente** onde o padrão define traçado animado (p. ex., tronco e ramos).
* `.a-text` — anima **texto com traço+preenchimento**:

  ```html
  <text x="750" y="110" class="u-center u-bold u-h a-text" style="--delay:.10s">TÍTULO</text>
  ```

> Observação: para **painéis internos** (tabela, histograma, boxplot, scanner, etc.), mantenha as animações **próprias** desses componentes. O padrão unificado se aplica **principalmente aos conectores e títulos**.

---

## 4) Sequenciamento com `--delay`

Qualquer elemento com `.a-draw` ou `.a-text` pode atrasar sua entrada com a custom property `--delay`:

```html
<line ... class="u-stroke u-thick a-draw" style="--delay:0s"/>
<line ... class="u-stroke u-thick a-draw" style="--delay:.12s"/>
<line ... class="u-stroke u-thick a-draw" style="--delay:.24s"/>
```

Recomendações típicas:

* **Tronco**: `0s`
* **Barra horizontal**: `+.12s`
* **Ramos**: `+.24s`, `+.30s`, `+.36s` …
* **Cartões/labels**: `+.48s`, `+.62s`, `+.76s`, `+.90s` …

---

## 5) Ajustando o *dash* (evitar “risquinho fantasma”)

* `--dash` e `--dashText` devem ser **maiores** que o comprimento de qualquer segmento/contorno que você vá animar.
* Se aparecer traço residual no fim do ciclo, **aumente** `--dash` (p. ex., `--dash: 1200`).
* Para caixas muito grandes, `--dash` pode ficar em `1600–2200`.

---

## 6) Marcadores de seta (padrão)

No `<defs>`:

```html
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
  <path d="M0,0 L10,5 L0,10 Z" fill="#111827"/>
</marker>
```

Uso:

```html
<line x1="490" y1="210" x2="710" y2="210" class="u-stroke u-thick a-draw" marker-end="url(#arrow)"/>
```

---

## 7) Padrões por tipo de elemento

### 7.1 Conectores (tronco, barra, ramos)

* `class="u-stroke u-thick a-draw"` + `style="--delay:..."`
* São **os únicos** que **sempre** recebem o traçado animado no diagrama padrão.

### 7.2 Títulos/rótulos que “desenham e preenchem”

* `class="u-center u-bold u-h a-text"` (ou outro tamanho) + `style="--delay:..."`
* Mantêm a estética uniforme em todos os SVGs.

### 7.3 Painéis internos (conteúdo)

* **Preferência**: manter a animação própria local (p. ex., barras crescendo, *scanner* da amostra, pulsos).
* Não aplicar `.a-draw` indiscriminadamente — use apenas onde o padrão prevê.

---

## 8) Redução de movimento

Já incluída:

```css
@media (prefers-reduced-motion:reduce){
  .a-draw,.a-text{ animation:none !important; opacity:1 }
  .a-text{ fill:var(--ink); stroke-dashoffset:0 }
}
```

Nada a fazer: quem usa o sistema com redução de movimento verá tudo estático e legível.

---

## 9) Exemplos de uso rápido

### 9.1 Tronco + barra + ramos

```html
<line x1="750" y1="170" x2="750" y2="230" class="u-stroke u-thick a-draw" style="--delay:0s"/>
<line x1="250" y1="230" x2="1250" y2="230" class="u-stroke u-thick a-draw" style="--delay:.12s"/>
<line x1="290"  y1="230" x2="290"  y2="280" class="u-stroke u-thick a-draw" style="--delay:.24s"/>
```

### 9.2 Caixa/título do topo

```html
<rect x="520" y="60" width="460" height="110" class="u-stroke u-box"/>
<text x="750" y="110" class="u-center u-bold u-h a-text" style="--delay:.10s">ESTATÍSTICA</text>
```

### 9.3 Setas com haste animada

```html
<line x1="490" y1="210" x2="710" y2="210" class="u-stroke u-thick a-draw" marker-end="url(#arrow)" style="--delay:.35s"/>
```

---

## 10) Erros comuns e correções

* **“Risquinho” no final do ciclo**: `--dash` pequeno demais → aumente para 1200+.
* **Texto “pisca” no pivô**: o par `k-textStroke/k-textFill` já suaviza; evite `animation-direction: alternate` para estes.
* **Painéis internos fora de sincronia**: dê `--delay` igual ou múltiplos coerentes (`.48s`, `.62s`…) nos grupos internos.
* **Serrilhado em zoom**: adicione `vector-effect="non-scaling-stroke"` naquilo que deve manter espessura (opcional; crie `.u-ns` se quiser padronizar).

---

## 11) Estender o padrão

* **Novas utilitárias**: prefixe com `u-` (ex.: `.u-ns { vector-effect:non-scaling-stroke }`).
* **Novas animações**: prefixe com `a-` e *keyframes* `k-*` (ex.: `.a-fade`, `@keyframes k-fade`).
* **Novas variáveis**: mantenha poucas e semânticas (`--accent`, `--muted`, etc.) para não diluir o padrão.

---

## 12) Checklist ao criar/ajustar um SVG

1. Incluiu o **cabeçalho padrão** (`:root`, utilitárias, animações)?
2. **Conectores** usam `u-stroke u-thick a-draw` com `--delay` escalonado?
3. **Títulos/rótulos animados** usam `a-text`?
4. Os **painéis internos** preservam suas animações locais?
5. `prefers-reduced-motion` funciona (sem *flicker*)?
6. `--dash`/`--dashText` grandes o suficiente (sem resíduo de traço)?
7. Setas com `marker-end="url(#arrow)"` (se houver)?

---

## 13) Estrutura recomendada do SVG

```html
<svg ...>
  <title>...</title><desc>...</desc>

  <defs>
    <style>/* padrão descrito acima */</style>
    <!-- markers, símbolos, etc. -->
  </defs>

  <g id="scene">
    <!-- topo -->
    <rect class="u-stroke u-box" .../>
    <text class="u-center u-bold u-h a-text" ...>TÍTULO</text>

    <!-- conectores (tronco/barra/ramos) -->
    <line class="u-stroke u-thick a-draw" style="--delay:0s" .../>
    <line class="u-stroke u-thick a-draw" style="--delay:.12s" .../>
    <line class="u-stroke u-thick a-draw" style="--delay:.24s" .../>

    <!-- painéis internos (cada um com seu conteúdo/animations) -->
    <g id="panel-1">...</g>
    <g id="panel-2">...</g>
    <g id="panel-3">...</g>
  </g>
</svg>
```

---

## 14) Perguntas rápidas

* **Posso usar o padrão só para o tronco/ramos e manter o resto estático?** Sim.
* **Posso alterar `--cycle` localmente?** Sim; mantenha valores múltiplos de 0.5–1s para sincronizar.
* **E se um contorno é muito longo?** Eleve `--dash` para ficar ≥ 1.2× do perímetro.

---

## Conclusão

Com **utilitárias `u-*`**, **animáveis `a-*`**, **variáveis enxutas** e **sequenciamento por `--delay`**, todos os SVGs ficam coesos e fáceis de manter. Ao criar novas figuras, basta colar o cabeçalho, aplicar `u-*` para estrutura e `a-*` nos pontos definidos (geralmente conectores e títulos), ajustar `--delay` e, se necessário, ampliar `--dash`.

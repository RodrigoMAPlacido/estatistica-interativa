// =========================================================
// TEXT-TO-SPEECH — Estatística Interativa (Versão PRO DOM-REAL)
// =========================================================

class TTSFormula {
  constructor(element) {
    this.el = element;
  }

  getText() {
    const t = this.el.getAttribute("data-tts");
    if (t && t.trim().length > 0) return t.trim();
    return "Fórmula matemática sem descrição textual definida.";
  }
}

class TTSController {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.currentUtterance = null;

    this.highlightSpans = [];
    this._paused = false;

    this.rate = 1.0;

    this.waitForVoices().then(() => this.loadVoices());
  }

  // ------------------------------------------
  // Velocidade
  // ------------------------------------------
  setRate(v) {
    const r = Math.max(0.5, Math.min(2.0, v));
    this.rate = r;
  }

  // ------------------------------------------
  // Vozes
  // ------------------------------------------
  waitForVoices() {
    return new Promise(resolve => {
      const v = this.synth.getVoices();
      if (v.length > 0) {
        this.voices = v;
        resolve();
        return;
      }
      const interval = setInterval(() => {
        const list = this.synth.getVoices();
        if (list.length > 0) {
          clearInterval(interval);
          this.voices = list;
          resolve();
        }
      }, 200);
    });
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
  }

  getVoice() {
    return (
      this.voices.find(v => v.lang === "pt-BR") ||
      this.voices.find(v => v.lang && v.lang.startsWith("pt")) ||
      this.voices[0] ||
      null
    );
  }

  getStatus() {
    if (this._paused) return "paused";
    if (this.synth.speaking) return "playing";
    return "stopped";
  }

  // ------------------------------------------
  // Highlight — limpar spans
  // ------------------------------------------
  clearHighlight() {
    this.highlightSpans.forEach(span => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    });
    this.highlightSpans = [];
  }

  // ------------------------------------------
  // Normalização do texto para o TTS
  // ------------------------------------------
cleanForSpeech(text) {
  text = text.replace(/R\$\s*([\d\.]+),00/g, function(_, valor) {
    return valor + " reais";
  });

  return text
    .replace(/\s+/g, " ")
    .trim();
}

  // ======================================================
  // Utilitários de texto REAL (DOM) — AJUSTADO
  // ======================================================
  extractRealText(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodes = [];
    let fullText = "";

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;

      // ============================================================
      // INLINE FORMULA → substitui tudo pelo data-tts e PULA o KaTeX
      // ============================================================
      if (parent && parent.closest(".formula-inline")) {
        const container = parent.closest(".formula-inline");
        const spoken = container.getAttribute("data-tts") || "";

        nodes.push({
          node: container.firstChild, // usamos referência fake
          isInlineFormula: true,
          spoken
        });

        fullText += spoken;

        // PULAR todos os nós internos da fórmula KaTeX
        // → avançamos o walker até sair dela
        while (walker.nextNode()) {
          if (!walker.currentNode.parentElement.closest(".formula-inline")) {
            walker.previousNode(); // voltar uma para não perder
            break;
          }
        }

        continue;
      }

      // ============================================================
      // TEXTO NORMAL
      // ============================================================
      const txt = node.textContent;

      nodes.push({
        node,
        isInlineFormula: false,
        spoken: txt
      });

      fullText += txt;
    }

    return { nodes, fullText };
  }

  splitSentences(fullText) {
    return fullText
      .split(/(?<=[.!?…])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  computeOffsets(fullText, sentences) {
    let offsets = [];
    let cursor = 0;

    for (const s of sentences) {
      const idx = fullText.indexOf(s, cursor);
      if (idx === -1) {
        offsets.push([null, null]);
      } else {
        offsets.push([idx, idx + s.length]);
        cursor = idx + s.length;
      }
    }
    return offsets;
  }

  // ======================================================
  // rangeForOffsets — AJUSTADO
  // ======================================================
  rangeForOffsets(nodes, start, end) {
    const range = document.createRange();
    let idx = 0;
    let started = false;

    for (let i = 0; i < nodes.length; i++) {
      const obj = nodes[i];
      const realNode = obj.node;

      const len = obj.isInlineFormula
        ? obj.spoken.length
        : realNode.textContent.length;

      const nodeStart = idx;
      const nodeEnd = idx + len;

      if (!started && nodeEnd > start) {
        const from = Math.max(0, start - nodeStart);
        range.setStart(realNode, from);
        started = true;
      }

      if (started && nodeEnd >= end) {
        const to = end - nodeStart;
        range.setEnd(realNode, to);
        return range;
      }

      idx += len;
    }

    return null;
  }

  // ======================================================
  // Highlight — AJUSTADO
  // ======================================================
  highlightSentence(blockEl, start, end) {
    if (start == null || end == null || end <= start) return;

    this.clearHighlight();

    const { nodes } = this.extractRealText(blockEl);
    const spans = [];
    let idx = 0;

    for (const obj of nodes) {
      const realNode = obj.node;

      const len = obj.isInlineFormula
        ? obj.spoken.length
        : realNode.textContent.length;

      const nodeStart = idx;
      const nodeEnd = idx + len;

      // ❗ Se é fórmula inline → NÃO highlight, mas AVANÇA os offsets normalmente
      if (obj.isInlineFormula) {
        idx += len;
        continue; // ← isso é essencial
      }

      // highlight normal para partes fora da fórmula
      if (nodeEnd > start && nodeStart < end) {
        const from = Math.max(0, start - nodeStart);
        const to = Math.min(len, end - nodeStart);

        const range = document.createRange();
        range.setStart(realNode, from);
        range.setEnd(realNode, to);

        const span = document.createElement("span");
        span.className = "tts-highlight";

        try {
          range.surroundContents(span);
        } catch (e) {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }

        spans.push(span);
      }

      idx += len;
    }

    this.highlightSpans = spans;

    requestAnimationFrame(() => {
      if (this.highlightSpans[0]) {
        this.highlightSpans[0].scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });
  }

  // ======================================================
  // STOP / PAUSE / RESUME — (inalterado)
  // ======================================================
  async stop() {
    if (this.synth.speaking || this.synth.paused) {
      this.synth.cancel();
    }
    this.clearHighlight();
    this._paused = false;
    this.currentUtterance = null;
    await new Promise(r => setTimeout(r, 120));
  }

  pause() {
    this._paused = true;
    this.synth.cancel();
  }

  resume() {
    this._paused = false;
    this.speakSequential();
  }

  // ======================================================
  // Leitura sequencial — (inalterado, exceto fórmula de BLOCO)
  // ======================================================
  async speakSequential() {
    await this.stop();
    this._paused = false;
    await this.waitForVoices();

    const blocks = Array.from(
      document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main p, main li")
    ).filter(el => el.textContent.replace(/\s+/g, "").length > 0);

    if (!blocks.length) return;

    const viewportTop = 0;
    const viewportBottom = window.innerHeight;

    let blockIndex = 0;
    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      if (rect.bottom > viewportTop && rect.top < viewportBottom) {
        blockIndex = i;
        break;
      }
    }

    const prepareBlock = (blockEl) => {
      const { nodes, fullText } = this.extractRealText(blockEl);
      const sentences = this.splitSentences(fullText);
      const offsets = this.computeOffsets(fullText, sentences);
      return { nodes, sentences, offsets };
    };

    let { nodes, sentences, offsets } = prepareBlock(blocks[blockIndex]);

    const findVisibleSentence = () => {
      for (let i = 0; i < sentences.length; i++) {
        const [start, end] = offsets[i];
        if (start == null) continue;

        const range = this.rangeForOffsets(nodes, start, end);
        if (!range) continue;

        const rects = range.getClientRects();
        for (let r of rects) {
          if (r.bottom > viewportTop && r.top < viewportBottom) {
            return i;
          }
        }
      }
      return 0;
    };

    let sentenceIndex = findVisibleSentence();

    // ==================================================
    // LOOP DE LEITURA
    // ==================================================
    const readSentence = () => {
      if (this._paused) return;

      const blockEl = blocks[blockIndex];

      // ======== FORMULA DE BLOCO ========
      if (blockEl.classList.contains("formula")) {
        const formula = new TTSFormula(blockEl);
        const text = formula.getText();
        this.clearHighlight();

        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = this.getVoice();
        utter.rate = this.rate;

        this.currentUtterance = utter;

        utter.onend = () => {
          if (!this._paused) {
            blockIndex++;
            sentenceIndex = 0;
            if (blockIndex < blocks.length) readSentence();
            else this.clearHighlight();
          }
        };

        this.synth.speak(utter);
        return;
      }

      // ======== FRASES NORMAIS ========
      ({ nodes, sentences, offsets } = prepareBlock(blockEl));

      if (!sentences.length) {
        blockIndex++;
        sentenceIndex = 0;
        if (blockIndex < blocks.length) return readSentence();
        this.clearHighlight();
        return;
      }

      if (sentenceIndex >= sentences.length) {
        blockIndex++;
        sentenceIndex = 0;
        if (blockIndex < blocks.length) return readSentence();
        this.clearHighlight();
        return;
      }

      const sentence = sentences[sentenceIndex];
      const [start, end] = offsets[sentenceIndex];

      if (!sentence || start == null) {
        sentenceIndex++;
        return readSentence();
      }

      this.highlightSentence(blockEl, start, end);

      const spokenSentence = this.cleanForSpeech(sentence);
      if (!spokenSentence) {
        sentenceIndex++;
        return readSentence();
      }

      const utter = new SpeechSynthesisUtterance(spokenSentence);
      utter.voice = this.getVoice();
      utter.rate = this.rate;

      this.currentUtterance = utter;

      utter.onend = () => {
        if (!this._paused) {
          sentenceIndex++;
          readSentence();
        }
      };

      this.synth.speak(utter);
    };

    readSentence();
  }
}

window.SPEECH = new TTSController();

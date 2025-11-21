// =========================================================
// TEXT-TO-SPEECH — Estatística Interativa (Versão PRO DOM-REAL)
// - Highlight preciso via TextNodes
// - Começa no PRIMEIRO parágrafo visível
// - Começa na primeira frase visível desse parágrafo
// - Resume contextual (sempre a partir do que está na tela)
// - Recalcula DOM/offsets a cada frase
// - Controle de velocidade
// =========================================================

class TTSController {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.currentUtterance = null;

    this.highlightSpans = [];
    this._paused = false;

    // velocidade padrão
    this.rate = 1.0;

    this.waitForVoices().then(() => this.loadVoices());
  }

  // ------------------------------------------
  // Velocidade
  // ------------------------------------------
  setRate(v) {
    const r = Math.max(0.5, Math.min(2.0, v)); // 0.5x–2.0x
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

  // ======================================================
  // Utilitários de texto REAL (DOM)
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
      nodes.push(node);
      fullText += node.textContent;
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

  rangeForOffsets(nodes, start, end) {
    const range = document.createRange();
    let idx = 0;
    let started = false;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const len = node.textContent.length;
      const nodeStart = idx;
      const nodeEnd = idx + len;

      if (!started && nodeEnd > start) {
        const from = Math.max(0, start - nodeStart);
        range.setStart(node, from);
        started = true;
      }

      if (started && nodeEnd >= end) {
        const to = end - nodeStart;
        range.setEnd(node, to);
        return range;
      }

      idx += len;
    }
    return null;
  }

  // ======================================================
  // Highlight de uma frase
  // ======================================================
  highlightSentence(blockEl, start, end) {
    if (start == null || end == null || end <= start) return;

    this.clearHighlight();

    const { nodes } = this.extractRealText(blockEl);
    const spans = [];
    let idx = 0;

    for (const node of nodes) {
      const len = node.textContent.length;
      const nodeStart = idx;
      const nodeEnd = idx + len;

      if (nodeEnd > start && nodeStart < end) {
        const from = Math.max(0, start - nodeStart);
        const to = Math.min(len, end - nodeStart);

        const range = document.createRange();
        range.setStart(node, from);
        range.setEnd(node, to);

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
  // STOP / PAUSE / RESUME
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
  // Leitura sequencial a partir do PRIMEIRO bloco visível
  // ======================================================
  async speakSequential() {
    await this.stop();
    this._paused = false;
    await this.waitForVoices();

    // Blocos de texto relevantes (p e li, fora de figure, se você quiser pode adicionar !el.closest("figure"))
    const blocks = Array.from(
      document.querySelectorAll("main p, main li")
    ).filter(el => el.textContent.replace(/\s+/g, "").length > 0);

    if (!blocks.length) return;

    const viewportTop = 0;
    const viewportBottom = window.innerHeight;

    // 1) Encontrar o PRIMEIRO parágrafo visível (topo da tela)
    let blockIndex = 0;
    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      if (rect.bottom > viewportTop && rect.top < viewportBottom) {
        blockIndex = i;
        break;
      }
    }

    // 2) Dentro desse bloco, localizar a primeira frase visível
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

      // Recalcular DOM/offsets a cada frase para evitar bugs de highlight
      ({ nodes, sentences, offsets } = prepareBlock(blockEl));

      // se não há frases neste bloco, pula para o próximo
      if (!sentences.length) {
        blockIndex++;
        sentenceIndex = 0;
        if (blockIndex < blocks.length) return readSentence();
        this.clearHighlight();
        return;
      }

      // fim das frases desse bloco → próximo bloco
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

      const utter = new SpeechSynthesisUtterance(sentence);
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

(function initToolHoverCards() {
  if (typeof document === 'undefined' || window.__toolHoverCardsInitialized) return;
  window.__toolHoverCardsInitialized = true;

  var ALLOWED_CONTAINERS = [
    'p.lead',
    '.lead',
    '.preamble',
    '.prose',
    '.side-note',
    '.quiz-q',
    '.quiz-explain',
    '.companion-note',
    '.markdown-body p',
    '.markdown-body li'
  ].join(', ');

  var FORBIDDEN_ANCESTORS =
    'pre, h1, h2, h3, h4, h5, h6, svg, a, button, .preamble-label, .side-note-label, .entry-footer, .comments-section, .standalone-topbar';

  var GRACE_DELAY_MS = 150;
  var VIEWPORT_PAD = 12;
  var CARD_GAP = 8;

  var exactMap = Object.create(null);
  var lowerMap = Object.create(null);
  var byId = Object.create(null);

  function loadGlossary() {
    var scriptEl = document.getElementById('tool-glossary');
    if (!scriptEl) return false;
    try {
      var parsed = JSON.parse(scriptEl.textContent || '{}');
      var list = Array.isArray(parsed.tools) ? parsed.tools : [];
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        if (!entry || !entry.id || !Array.isArray(entry.tokens)) continue;
        byId[entry.id] = entry;
        for (var j = 0; j < entry.tokens.length; j++) {
          var tok = String(entry.tokens[j] || '').trim();
          if (!tok) continue;
          if (entry.caseSensitive) {
            exactMap[tok] = entry;
          } else {
            exactMap[tok] = entry;
            lowerMap[tok.toLowerCase()] = entry;
          }
        }
      }
      return list.length > 0;
    } catch (err) {
      return false;
    }
  }

  function matchGlossary(rawText) {
    var key = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!key) return null;
    if (exactMap[key]) return exactMap[key];
    var lower = key.toLowerCase();
    if (lowerMap[lower]) return lowerMap[lower];
    return null;
  }

  var card = null;
  var titleEl = null;
  var kindEl = null;
  var descEl = null;
  var footEl = null;
  var linkEl = null;
  var linkLabelEl = null;

  var activeTrigger = null;
  var hideTimer = null;
  var pinned = false;
  var openedAt = 0;
  var lastPointerType = 'mouse';
  var pointerDownInFlight = false;

  function ensureCard() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'tool-hover-card';
    card.id = 'tool-hover-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('data-placement', 'below');

    var head = document.createElement('div');
    head.className = 'thc-head';

    titleEl = document.createElement('span');
    titleEl.className = 'thc-title';
    titleEl.id = 'tool-hover-card-title';

    kindEl = document.createElement('span');
    kindEl.className = 'thc-kind';

    head.appendChild(titleEl);
    head.appendChild(kindEl);

    descEl = document.createElement('p');
    descEl.className = 'thc-desc';
    descEl.id = 'tool-hover-card-desc';

    footEl = document.createElement('div');
    footEl.className = 'thc-foot';

    linkEl = document.createElement('a');
    linkEl.className = 'thc-link';
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';

    linkLabelEl = document.createElement('span');
    var arrowEl = document.createElement('span');
    arrowEl.className = 'thc-arrow';
    arrowEl.setAttribute('aria-hidden', 'true');
    arrowEl.textContent = '↗';

    linkEl.appendChild(linkLabelEl);
    linkEl.appendChild(arrowEl);
    footEl.appendChild(linkEl);

    card.setAttribute('aria-labelledby', 'tool-hover-card-title');
    card.appendChild(head);
    card.appendChild(descEl);
    card.appendChild(footEl);

    card.addEventListener('mouseenter', function() {
      if (lastPointerType === 'touch') return;
      clearHideTimer();
    });

    card.addEventListener('mouseleave', function() {
      if (lastPointerType === 'touch' || pinned) return;
      scheduleHide();
    });

    card.addEventListener('focusin', function() {
      clearHideTimer();
    });

    card.addEventListener('focusout', function() {
      setTimeout(function() {
        if (!activeTrigger) return;
        var ae = document.activeElement;
        if (ae !== activeTrigger && !card.contains(ae) && !pinned) {
          closeCard();
        }
      }, 0);
    });

    card.addEventListener('keydown', function(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        var returnTo = activeTrigger;
        closeCard();
        if (returnTo && typeof returnTo.focus === 'function') {
          returnTo.focus();
        }
      } else if (ev.key === 'Tab' && !ev.shiftKey && activeTrigger) {
        var next = findNextFocusableAfter(activeTrigger);
        closeCard();
        if (next) {
          ev.preventDefault();
          next.focus();
        }
      } else if (ev.key === 'Tab' && ev.shiftKey && activeTrigger) {
        ev.preventDefault();
        activeTrigger.focus();
      }
    });

    document.body.appendChild(card);
    return card;
  }

  function findNextFocusableAfter(el) {
    var selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var all = Array.prototype.slice.call(document.querySelectorAll(selector)).filter(function(node) {
      return (!card || !card.contains(node)) && node.offsetParent !== null;
    });
    var idx = all.indexOf(el);
    if (idx !== -1 && idx + 1 < all.length) {
      return all[idx + 1];
    }
    return null;
  }

  function clearHideTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = setTimeout(function() {
      hideTimer = null;
      closeCard();
    }, GRACE_DELAY_MS);
  }

  function isCliLikeTitle(title) {
    return /^[a-z0-9_./-]+(\s+[a-z0-9_./-]+)*$/.test(title);
  }

  function renderCardContent(entry) {
    ensureCard();
    titleEl.textContent = entry.title || entry.id;
    titleEl.classList.toggle('is-mono', isCliLikeTitle(entry.title || ''));
    if (entry.kind) {
      kindEl.textContent = entry.kind;
      kindEl.style.display = '';
    } else {
      kindEl.textContent = '';
      kindEl.style.display = 'none';
    }
    descEl.textContent = entry.description || '';

    if (entry.url) {
      linkEl.href = entry.url;
      linkLabelEl.textContent = entry.urlLabel || entry.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      footEl.style.display = '';
    } else {
      linkEl.removeAttribute('href');
      linkLabelEl.textContent = '';
      footEl.style.display = 'none';
    }
  }

  function getTriggerRect(trigger) {
    var rects = trigger.getClientRects();
    if (rects && rects.length > 0) {
      return rects[0];
    }
    return trigger.getBoundingClientRect();
  }

  function positionCard(trigger) {
    if (!card || !trigger) return;
    var tRect = getTriggerRect(trigger);
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = document.documentElement.clientHeight || window.innerHeight;

    // Close cleanly if scrolled well outside the viewport
    if (tRect.bottom < -32 || tRect.top > vh + 32) {
      closeCard();
      return;
    }

    var cRect = card.getBoundingClientRect();
    var cardW = cRect.width || Math.min(316, vw - VIEWPORT_PAD * 2);
    var cardH = cRect.height || 120;

    var left = tRect.left;
    if (left + cardW > vw - VIEWPORT_PAD) {
      left = vw - VIEWPORT_PAD - cardW;
    }
    if (left < VIEWPORT_PAD) {
      left = VIEWPORT_PAD;
    }

    var spaceBelow = vh - tRect.bottom - CARD_GAP - VIEWPORT_PAD;
    var spaceAbove = tRect.top - CARD_GAP - VIEWPORT_PAD;
    var placement = 'below';
    var top = tRect.bottom + CARD_GAP;

    if (spaceBelow < cardH && spaceAbove > spaceBelow) {
      placement = 'above';
      top = tRect.top - CARD_GAP - cardH;
    }

    var maxTop = Math.max(VIEWPORT_PAD, vh - VIEWPORT_PAD - cardH);
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;
    if (top > maxTop) top = maxTop;

    var triggerCenterX = tRect.left + tRect.width / 2;
    var arrowX = Math.max(16, Math.min(cardW - 16, Math.round(triggerCenterX - left)));

    card.setAttribute('data-placement', placement);
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
    card.style.setProperty('--thc-arrow-x', arrowX + 'px');
  }

  function openCard(trigger, options) {
    var opts = options || {};
    var toolId = trigger.getAttribute('data-tool-id');
    var entry = toolId ? byId[toolId] : null;
    if (!entry) return;

    clearHideTimer();

    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
      activeTrigger.removeAttribute('aria-controls');
      activeTrigger.removeAttribute('aria-describedby');
    }

    var wasSameOpen = activeTrigger === trigger && card && card.classList.contains('is-open');
    activeTrigger = trigger;
    if (opts.pin !== undefined) {
      pinned = Boolean(opts.pin);
    } else if (!wasSameOpen) {
      pinned = false;
    }

    renderCardContent(entry);
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', 'tool-hover-card');
    trigger.setAttribute('aria-describedby', 'tool-hover-card-desc');

    card.classList.add('is-open');
    positionCard(trigger);
    if (!wasSameOpen) {
      openedAt = Date.now();
    }
  }

  function closeCard() {
    clearHideTimer();
    pinned = false;
    if (activeTrigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
      activeTrigger.removeAttribute('aria-controls');
      activeTrigger.removeAttribute('aria-describedby');
      activeTrigger = null;
    }
    if (card) {
      card.classList.remove('is-open');
    }
  }

  function bindTrigger(codeEl, entry) {
    if (codeEl.hasAttribute('data-tool-id')) return;
    codeEl.classList.add('tool-hover-trigger');
    codeEl.setAttribute('data-tool-id', entry.id);
    codeEl.setAttribute('tabindex', '0');
    codeEl.setAttribute('role', 'button');
    codeEl.setAttribute('aria-haspopup', 'dialog');
    codeEl.setAttribute('aria-expanded', 'false');

    codeEl.addEventListener('pointerdown', function(ev) {
      lastPointerType = ev.pointerType || 'mouse';
      pointerDownInFlight = true;
      setTimeout(function() {
        pointerDownInFlight = false;
      }, 0);
    });

    codeEl.addEventListener('mouseenter', function() {
      if (lastPointerType === 'touch') return;
      openCard(codeEl, { pin: activeTrigger === codeEl ? pinned : false });
    });

    codeEl.addEventListener('mouseleave', function() {
      if (lastPointerType === 'touch' || pinned) return;
      if (activeTrigger === codeEl) {
        scheduleHide();
      }
    });

    codeEl.addEventListener('focus', function() {
      if (pointerDownInFlight || lastPointerType === 'touch') return;
      openCard(codeEl, { pin: false });
    });

    codeEl.addEventListener('blur', function() {
      setTimeout(function() {
        if (activeTrigger !== codeEl || pinned) return;
        var ae = document.activeElement;
        if (card && card.contains(ae)) return;
        if (card && card.matches(':hover')) return;
        closeCard();
      }, 0);
    });

    codeEl.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var isCurrentlyOpen = activeTrigger === codeEl && card && card.classList.contains('is-open');
      if (lastPointerType === 'touch') {
        if (isCurrentlyOpen) {
          closeCard();
        } else {
          openCard(codeEl, { pin: true });
        }
        return;
      }

      // Mouse/keyboard click: if not open, open & pin; if just opened by hover (<350ms) and unpinned, pin it; otherwise toggle closed
      if (!isCurrentlyOpen) {
        openCard(codeEl, { pin: true });
      } else if (!pinned && Date.now() - openedAt < 350) {
        pinned = true;
        clearHideTimer();
      } else if (!pinned) {
        pinned = true;
        clearHideTimer();
      } else {
        closeCard();
      }
    });

    codeEl.addEventListener('keydown', function(ev) {
      var isCurrentlyOpen = activeTrigger === codeEl && card && card.classList.contains('is-open');
      if (ev.key === 'Escape' && isCurrentlyOpen) {
        ev.preventDefault();
        closeCard();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (isCurrentlyOpen && pinned) {
          closeCard();
        } else {
          openCard(codeEl, { pin: true });
        }
      } else if (
        ev.key === 'Tab' &&
        !ev.shiftKey &&
        isCurrentlyOpen &&
        footEl &&
        footEl.style.display !== 'none' &&
        linkEl &&
        linkEl.hasAttribute('href')
      ) {
        ev.preventDefault();
        linkEl.focus();
      }
    });
  }

  function enhanceContainer(root) {
    if (!root || !root.querySelectorAll) return;
    var codes = root.querySelectorAll('code');
    for (var i = 0; i < codes.length; i++) {
      var codeEl = codes[i];
      if (codeEl.hasAttribute('data-tool-id')) continue;
      if (codeEl.closest(FORBIDDEN_ANCESTORS)) continue;
      if (!codeEl.closest(ALLOWED_CONTAINERS)) continue;
      var matched = matchGlossary(codeEl.textContent);
      if (matched) {
        bindTrigger(codeEl, matched);
      }
    }
  }

  function init() {
    if (!loadGlossary()) return;
    enhanceContainer(document);

    // Dismiss on outside click / tap
    document.addEventListener('pointerdown', function(ev) {
      lastPointerType = ev.pointerType || 'mouse';
      if (!activeTrigger || !card || !card.classList.contains('is-open')) return;
      var target = ev.target;
      if (card.contains(target)) return;
      if (target && target.closest && target.closest('code.tool-hover-trigger') === activeTrigger) return;
      closeCard();
    });

    // Global Escape handler (even when focus is on body after mouse hover)
    document.addEventListener('keydown', function(ev) {
      if (ev.key === 'Escape' && card && card.classList.contains('is-open')) {
        var toFocus = activeTrigger && document.activeElement && card.contains(document.activeElement)
          ? activeTrigger
          : null;
        closeCard();
        if (toFocus) toFocus.focus();
      }
    });

    var repositionTicking = false;
    function requestReposition() {
      if (!activeTrigger || !card || !card.classList.contains('is-open')) return;
      if (repositionTicking) return;
      repositionTicking = true;
      window.requestAnimationFrame(function() {
        repositionTicking = false;
        if (activeTrigger && card && card.classList.contains('is-open')) {
          positionCard(activeTrigger);
        }
      });
    }

    window.addEventListener('scroll', requestReposition, { passive: true });
    window.addEventListener('resize', requestReposition, { passive: true });

    // Enhance dynamically revealed prose (such as .quiz-explain on answer click)
    if (typeof MutationObserver !== 'undefined' && document.body) {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (!node || node.nodeType !== 1) continue;
            if (node === card || (card && card.contains(node))) continue;
            if (node.tagName === 'CODE') {
              if (node.parentElement) enhanceContainer(node.parentElement);
            } else {
              enhanceContainer(node);
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

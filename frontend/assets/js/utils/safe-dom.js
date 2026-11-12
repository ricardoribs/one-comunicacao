(function bootstrapSafeDom() {
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  const blockedTags = new Set(["BASE", "EMBED", "IFRAME", "LINK", "META", "OBJECT", "SCRIPT"]);
  const urlAttributes = new Set(["href", "src", "xlink:href", "formaction"]);
  const safeStyleProperties = new Set([
    "bottom",
    "flex",
    "height",
    "left",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-height",
    "max-width",
    "min-height",
    "min-width",
    "right",
    "top",
    "width",
  ]);
  const safeStyleValuePattern = /^[-\d\s.]+(?:px|%|rem|em|vh|vw)?$/i;

  if (!descriptor?.get || !descriptor?.set || window.ONE_SAFE_DOM) {
    return;
  }

  function isUnsafeUrl(value) {
    return /^\s*javascript:/i.test(String(value || ""));
  }

  function sanitizeStyle(style) {
    return String(style || "")
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const separator = declaration.indexOf(":");
        if (separator === -1) {
          return "";
        }

        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim();
        if (!safeStyleProperties.has(property) || !safeStyleValuePattern.test(value)) {
          return "";
        }

        return `${property}:${value}`;
      })
      .filter(Boolean)
      .join(";");
  }

  function applyDeferredStyles(root) {
    if (!root?.querySelectorAll) {
      return;
    }

    root.querySelectorAll("[data-one-style]").forEach((element) => {
      const declarations = String(element.getAttribute("data-one-style") || "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean);

      declarations.forEach((declaration) => {
        const separator = declaration.indexOf(":");
        if (separator === -1) {
          return;
        }

        const property = declaration.slice(0, separator).trim();
        const value = declaration.slice(separator + 1).trim();
        element.style.setProperty(property, value);
      });
      element.removeAttribute("data-one-style");
    });
  }

  function cleanNode(root) {
    root.querySelectorAll(Array.from(blockedTags).join(",")).forEach((node) => node.remove());

    root.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || "";

        if (name.startsWith("on") || name === "srcdoc") {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "style") {
          const safeStyle = sanitizeStyle(value);
          element.removeAttribute(attribute.name);
          if (safeStyle) {
            element.setAttribute("data-one-style", safeStyle);
          }
          return;
        }

        if (urlAttributes.has(name) && isUnsafeUrl(value)) {
          element.removeAttribute(attribute.name);
        }
      });
    });
  }

  function sanitizeHtml(html) {
    const template = document.createElement("template");
    descriptor.set.call(template, String(html ?? ""));
    cleanNode(template.content);
    return descriptor.get.call(template);
  }

  function setHtml(element, html) {
    if (!element) {
      return;
    }
    descriptor.set.call(element, sanitizeHtml(html));
    applyDeferredStyles(element);
  }

  Object.defineProperty(Element.prototype, "innerHTML", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return descriptor.get.call(this);
    },
    set(value) {
      descriptor.set.call(this, sanitizeHtml(value));
      applyDeferredStyles(this);
    },
  });

  window.ONE_SAFE_DOM = {
    applyDeferredStyles,
    sanitizeHtml,
    setHtml,
  };
})();

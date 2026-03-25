(function bootstrapFormUtils() {
  const FormUtils = {
    loading: (btn, isLoading, loadingText = "Aguarde...") => {
      if (!btn) {
        return;
      }

      btn._originalText = btn._originalText || btn.textContent;
      btn.disabled = Boolean(isLoading);
      btn.textContent = isLoading ? loadingText : btn._originalText;

      if (isLoading) {
        btn.setAttribute("aria-busy", "true");
      } else {
        btn.removeAttribute("aria-busy");
      }
    },

    submit: (formEl, asyncFn, options = {}) => async (event) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      const btn =
        options.button ||
        formEl?.querySelector('[type="submit"], .btn-submit') ||
        formEl?.querySelector("button");

      if (btn?.disabled) {
        return;
      }

      FormUtils.loading(btn, true, options.loadingText || "Aguarde...");
      try {
        await asyncFn(event);
      } finally {
        FormUtils.loading(btn, false);
      }
    }
  };

  window.FormUtils = FormUtils;
  window.ONE_FORM = {
    loading: FormUtils.loading,
    submit: FormUtils.submit,
    setButtonLoading: (buttonEl, isLoading, loadingText = "Aguarde...") =>
      FormUtils.loading(buttonEl, isLoading, loadingText),
    withLoadingState: (buttonEl, asyncFn, options = {}) =>
      FormUtils.submit(
        {
          querySelector: () => buttonEl
        },
        asyncFn,
        { ...options, button: buttonEl }
      )
  };
})();

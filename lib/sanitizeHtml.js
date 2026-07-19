// Оставляет только безопасные теги форматирования текста,
// убирает всё остальное (скрипты, атрибуты, произвольные теги).
// Работает только в браузере (использует DOM).
export function sanitizeHtml(html) {
  if (typeof document === "undefined") return "";

  const allowedTags = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "STRIKE",
    "S",
    "BR",
    "DIV",
    "P",
    "SPAN",
  ]);

  const temp = document.createElement("div");
  temp.innerHTML = html || "";

  function clean(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowedTags.has(child.tagName)) {
          const text = document.createTextNode(child.textContent);
          node.replaceChild(text, child);
          return;
        }
        [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
        clean(child);
      }
    });
  }

  clean(temp);
  return temp.innerHTML;
}

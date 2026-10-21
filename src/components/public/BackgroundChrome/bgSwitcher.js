export function pickBg(pathname, notFound) {
  if (notFound) return "03";
  if (pathname === "/") return "04";
  if (pathname === "/team" || pathname.startsWith("/team/")) return "02";
  if (pathname === "/contact" || pathname.startsWith("/contact/")) return "06";
  return "01";
}

export function createBgSwitcher(stack) {
  const slots = Array.from(stack.children);
  let timer = 0;

  const frontSlot = () => slots.find((s) => s.classList.contains("is-front"));
  const incomingSlot = () => slots.find((s) => s.classList.contains("is-incoming"));
  const otherSlot = () =>
    slots.find((s) => !s.classList.contains("is-front") && !s.classList.contains("is-incoming"));

  function clear(slot) {
    slot.classList.remove("is-front", "is-staged", "is-incoming");
    slot.hidden = true;
    delete slot.dataset.bg;
  }

  function finalize() {
    clearTimeout(timer);
    const incoming = incomingSlot();
    if (!incoming) return;
    slots.forEach((s) => {
      if (s !== incoming) clear(s);
    });
    incoming.classList.remove("is-incoming");
    incoming.classList.add("is-front");
  }

  function unstage() {
    const other = otherSlot();
    if (other) clear(other);
  }

  function stage(key) {
    if (incomingSlot()) return;
    const front = frontSlot();
    if (!front || front.dataset.bg === key) return;
    const other = otherSlot();
    if (!other) return;
    if (other.dataset.bg !== key) other.dataset.bg = key;
    other.hidden = false;
    other.classList.add("is-staged");
  }

  function show(key) {
    finalize();
    const front = frontSlot();
    if (!front) return;
    if (front.dataset.bg === key) {
      unstage();
      return;
    }
    const next = otherSlot();
    if (!next) return;
    next.dataset.bg = key;
    next.hidden = false;
    next.classList.remove("is-staged");
    next.classList.add("is-incoming");
    timer = setTimeout(finalize, 400);
  }

  function destroy() {
    clearTimeout(timer);
  }

  return { stage, show, destroy };
}

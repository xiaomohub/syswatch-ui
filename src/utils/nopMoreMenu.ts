/**
 * 将 `.nop-more-menu` 设为 fixed，避免被 `.nop-table-wrap { overflow: auto }` 裁剪。
 * 绑定在 `<details class="nop-more" @toggle="onNopMoreToggle">` 上。
 */
export function onNopMoreToggle(ev: Event): void {
  const details = ev.target
  if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('nop-more')) return

  const menu = details.querySelector<HTMLElement>('.nop-more-menu')
  const summary = details.querySelector('summary')
  if (!menu || !summary) return

  if (!details.open) {
    menu.style.removeProperty('top')
    menu.style.removeProperty('left')
    menu.style.removeProperty('right')
    return
  }

  document.querySelectorAll<HTMLDetailsElement>('details.nop-more').forEach((el) => {
    if (el !== details) el.removeAttribute('open')
  })

  const place = () => {
    const r = summary.getBoundingClientRect()
    const mw = menu.offsetWidth || 120
    const mh = menu.offsetHeight || 120
    let left = r.right - mw
    left = Math.min(left, window.innerWidth - mw - 8)
    left = Math.max(8, left)
    let top = r.bottom + 4
    if (top + mh > window.innerHeight - 8) {
      top = Math.max(8, r.top - mh - 4)
    }
    menu.style.top = `${top}px`
    menu.style.left = `${left}px`
    menu.style.right = 'auto'
  }
  requestAnimationFrame(() => requestAnimationFrame(place))
}

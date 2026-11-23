// Preserve keyboard position when a lazy-loaded branch or recommendation re-renders.
export function rememberFocus(scope=document) {
  const active=document.activeElement
  return active&&scope.contains(active)?active.dataset.focusKey:null
}
export function restoreFocus(scope,key) {
  if(!key)return
  const next=[...scope.querySelectorAll('[data-focus-key]')].find(node=>node.dataset.focusKey===key)
  next?.focus({preventScroll:true})
}

const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
const button=(text,run)=>{const n=el('button',text);n.type='button';n.onclick=run;return n}
export function createReviewView({container,filters,records,isBusy,onCheck,onTarget,onRemove,onFilter=()=>{},readyLabel='이동 준비'}){
  let filter='all',lastRows=[];const expanded=new Set()
  const category=r=>r.valid&&!r.failed?'ready':'need'
  function render(){
    const rows=records(),busy=isBusy(),active=document.activeElement?.dataset.focusKey,ownedFocus=container.contains(document.activeElement)||filters.contains(document.activeElement),scroll=container.scrollTop
    lastRows=rows
    container.classList.add('balanced-review');filters.replaceChildren();container.replaceChildren()
    const ready=rows.filter(r=>category(r)==='ready').length
    for(const [value,label]of [['all',`전체 ${rows.length}`],['ready',`${readyLabel} ${ready}`],['need',`확인 필요 ${rows.length-ready}`]]){
      const b=button(label,()=>{filter=value;render();onFilter()});b.setAttribute('aria-pressed',String(value===filter));b.dataset.reviewFilter=value;b.dataset.focusKey='review-filter:'+value;b.disabled=busy;filters.append(b)
    }
    const head=el('div',undefined,'balance-labels');head.setAttribute('aria-hidden','true');head.append(el('span',''),el('span','파일'),el('span','저장 위치'),el('span','상태'));container.append(head)
    const visible=rows.filter(r=>filter==='all'||category(r)===filter)
    if(!visible.length)container.append(el('p',rows.length?'이 상태에 해당하는 파일이 없어요.':'분류할 파일을 선택하거나 끌어 놓으세요.','empty'))
    for(const r of visible){
      const row=el('article',undefined,'queue-item qrow balance-row'+(r.failed?' failed':'')),check=el('input');check.type='checkbox';check.checked=r.checked&&r.valid;check.disabled=busy||!r.valid
      check.dataset.unavailable=String(!r.valid)
      check.setAttribute('aria-label',r.name+' 승인 대상');check.dataset.focusKey='queue-check:'+r.id;check.onchange=()=>{r.checked=check.checked;onCheck(r.id,check.checked)}
      const file=el('div',undefined,'balance-file'),name=el('strong',r.name);name.title=r.name;file.append(name)
      const info=button(expanded.has(r.id)?'상세 접기':'상세 보기',()=>{if(expanded.has(r.id))expanded.delete(r.id);else expanded.add(r.id);render()});info.className='balance-detail-button';info.setAttribute('aria-expanded',String(expanded.has(r.id)));info.dataset.focusKey='queue-info:'+r.id;info.disabled=busy;file.append(info)
      const select=el('select');select.setAttribute('aria-label',r.name+' 저장 위치');select.dataset.focusKey='queue-target:'+r.id;select.disabled=busy
      const placeholder=el('option','저장 위치 선택');placeholder.value='';select.append(placeholder)
      for(const target of r.targets){const option=el('option',target.label);option.value=target.id;option.title=target.path;select.append(option)}
      select.value=r.target;select.title=r.targets.find(t=>t.id===r.target)?.path??'저장 위치를 선택하세요.';select.className=r.valid?'':'needs-target'
      select.onchange=()=>onTarget(r.id,select.value)
      const state=el('span',r.failed?'처리 실패':r.valid?r.operation+' 준비':'확인 필요','balance-state '+(category(r)==='ready'?'ready':'need'))
      row.append(check,file,select,state)
      if(expanded.has(r.id)||r.failed){
        const details=el('div',undefined,'balance-details');details.append(el('p','원본 · '+r.source),el('p','저장 위치 · '+(select.title||'미지정')),el('p',r.reason))
        const remove=button('승인 대기에서 제외',()=>{expanded.delete(r.id);onRemove(r.id)});remove.disabled=busy;details.append(remove);row.append(details)
      }else if(!r.valid)row.append(el('p',r.reason||'저장 위치를 확인해 주세요.','balance-warning'))
      container.append(row)
    }
    const ids=new Set(rows.map(r=>r.id));for(const id of expanded)if(!ids.has(id))expanded.delete(id)
    container.scrollTop=scroll
    if(active&&ownedFocus)([...container.querySelectorAll('[data-focus-key]'),...filters.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===active)||filters.querySelector('[aria-pressed=true]'))?.focus({preventScroll:true})
  }
  return {render,hiddenSelected:()=>lastRows.filter(r=>r.valid&&r.checked&&filter!=='all'&&category(r)!==filter).length}
}

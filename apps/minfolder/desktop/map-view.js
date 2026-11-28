import {key} from '../core.js'
import {rememberFocus,restoreFocus} from './focus.js'
import {matchesName} from '../name-search.js'
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node}
const button=(text,action,cls)=>{const node=el('button',text,cls);node.type='button';node.onclick=action;return node}

// Keep the original horizontal map independent of filesystem and approval logic.
export function createMapView({state,load,select,onFileOpen,onFileDrag}) {
  const $=id=>document.getElementById(id), viewport=$('tree')
  let zoom=10,pan=null,wheel=0,wheelAt=0
  const unavailable=(node,off)=>{node.dataset.unavailable=String(off);node.disabled=state.busy||off}
  function controls(){
    unavailable($('zoom-out'),!state.root||zoom<=5);unavailable($('zoom-in'),!state.root||zoom>=16)
    unavailable($('map-expand'),!state.root);unavailable($('map-collapse'),!state.root)
    $('zoom-level').textContent=zoom*10+'%'
  }
  function changeZoom(step,x=viewport.clientWidth/2,y=viewport.clientHeight/2){
    const graph=viewport.querySelector('.map-graph'),next=Math.max(5,Math.min(16,zoom+step))
    if(!graph||next===zoom)return
    const left=(viewport.scrollLeft+x)*next/zoom-x,top=(viewport.scrollTop+y)*next/zoom-y
    zoom=next;graph.dataset.zoom=String(zoom);viewport.scrollLeft=left;viewport.scrollTop=top;controls()
  }
  function endPan(event){
    if(!pan||event.pointerId!==pan.id)return
    pan=null;viewport.classList.remove('is-panning')
    if(viewport.hasPointerCapture?.(event.pointerId))viewport.releasePointerCapture(event.pointerId)
  }
  function render(){
    const focus=rememberFocus(viewport)
    controls()
    if(!state.root){viewport.replaceChildren(el('p','기준 폴더를 연결하면 실제 폴더 구조가 여기에 나타나요.','empty'));return}
    const q=$('search').value.trim(),showFiles=$('show-files').checked,nodes=[...state.nodes.values()]
    const visible=new Set(),byPath=new Map(nodes.map(n=>[key(n.relative),n.id]))
    if(q)for(const node of nodes){
      if(matchesName(state.root.name,q)||node.relative.some(name=>matchesName(name,q))||(showFiles&&node.entries.some(e=>e.kind==='file'&&matchesName(e.name,q)))){
        for(let i=0;i<=node.relative.length;i++)visible.add(byPath.get(key(node.relative.slice(0,i))))
      }
    }
    let remaining=450
    function branch(node){
      const wrap=el('div',undefined,'map-node');remaining--
      const card=el('div',undefined,'map-folder'+(state.selected===node.id?' selected':''));card.dataset.folder=node.id
      const name=button(node.name,()=>select(node.id),'folder-name');name.title=node.path;name.dataset.focusKey='map-folder:'+node.id
      const toggle=button(node.opened?'−':'+',async()=>{node.opened=!node.opened;render();if(node.opened)await load(node)},'toggle')
      toggle.dataset.focusKey='map-toggle:'+node.id
      toggle.setAttribute('aria-label',node.name+(node.opened?' 접기':' 펼치기'));toggle.setAttribute('aria-expanded',String(node.opened))
      card.append(name,toggle);wrap.append(card)
      if(node.opened||q){
        const children=el('div',undefined,'map-children')
        const folders=[...new Map([...(node.priorDirectories??[]),...node.entries.filter(e=>e.kind==='directory')].map(e=>[e.id,e])).values()]
        for(const entry of folders){const next=state.nodes.get(entry.id);if(next&&(!q||visible.has(next.id))&&remaining>0)children.append(branch(next))}
        if(showFiles)for(const file of node.entries.filter(e=>e.kind==='file')){
          if(remaining<=0)break
          if(q&&!matchesName(file.name,q)&&!matchesName(state.root.name,q)&&!node.relative.some(n=>matchesName(n,q)))continue
          remaining--
          const leaf=el('div',undefined,'map-node'),card=el('div',undefined,'map-file'),name=button(file.name,()=>onFileOpen(file),'map-file-name')
          name.dataset.focusKey='map-file:'+file.id;name.title=file.path+' · 클릭해서 열기 · 끌어서 이동';name.onpointerdown=e=>onFileDrag(e,file);card.append(name);leaf.append(card);children.append(leaf)
        }
        if(node.error){const error=el('div',undefined,'map-node');error.append(el('p','읽기 실패 · '+node.error,'empty'));children.append(error)}
        if(!node.done){const more=el('div',undefined,'map-node');more.append(button(node.loading?'읽는 중…':'다음 항목 보기',()=>load(node),'map-more'));children.append(more)}
        if(children.childNodes.length)wrap.append(children)
      }
      return wrap
    }
    const graph=el('div',undefined,'map-graph');graph.dataset.zoom=String(zoom)
    if(q&&!visible.size)graph.append(el('p','불러온 항목에 검색 결과가 없어요.','empty'))
    else graph.append(branch(state.nodes.get(state.root.id)))
    if(remaining<=0)graph.append(el('p','다른 가지를 접거나 검색해서 범위를 줄여 주세요.','empty'))
    viewport.replaceChildren(graph);restoreFocus(viewport,focus)
  }
  $('zoom-out').onclick=()=>changeZoom(-1);$('zoom-in').onclick=()=>changeZoom(1)
  $('show-files').onchange=render
  $('map-expand').onclick=async()=>{const node=state.nodes.get(state.selected);if(node){node.opened=true;render();await load(node)}}
  $('map-collapse').onclick=()=>{for(const n of state.nodes.values())n.opened=n.relative.length<2;$('search').value='';render()}
  viewport.addEventListener('wheel',event=>{
    if(!state.root||event.ctrlKey||!event.deltaY||pan)return
    event.preventDefault()
    const now=performance.now();if(now-wheelAt>170||Math.sign(wheel)!==Math.sign(event.deltaY))wheel=0
    wheelAt=now;wheel+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?100:1)
    if(Math.abs(wheel)<26)return
    const rect=viewport.getBoundingClientRect();changeZoom(wheel<0?1:-1,event.clientX-rect.left,event.clientY-rect.top);wheel=0
  },{passive:false})
  viewport.addEventListener('mousedown',event=>{if(event.button===1)event.preventDefault()})
  viewport.addEventListener('auxclick',event=>{if(event.button===1)event.preventDefault()})
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==1||!state.root)return
    event.preventDefault();pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('is-panning');viewport.setPointerCapture(event.pointerId)
  })
  viewport.addEventListener('pointermove',event=>{
    if(!pan||event.pointerId!==pan.id)return
    if(!(event.buttons&4)){endPan(event);return}
    event.preventDefault();viewport.scrollLeft=pan.left+pan.x-event.clientX;viewport.scrollTop=pan.top+pan.y-event.clientY
  })
  for(const name of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(name,endPan)
  return {render,reset(){zoom=10;viewport.scrollLeft=0;viewport.scrollTop=0;controls()}}
}

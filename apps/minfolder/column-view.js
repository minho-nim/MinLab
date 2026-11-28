import {matchesName} from './name-search.js'
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
const button=(text,run)=>{const b=el('button',text);b.type='button';b.onclick=run;return b}
const PAGE=100,RESULTS=200

// Both hosts supply their existing cache. Rendering and searching never read disk.
export function createColumnView({viewport,getData,select,load,query,decorateFolder,pickResult}){
  const pages=new Map();let lastPath='',lastLeft=0
  function render(){
    const active=document.activeElement?.dataset.focusKey,priorColumns=viewport.querySelector('.folder-columns')
    if(priorColumns)lastLeft=priorColumns.scrollLeft
    const scrolls=new Map([...viewport.querySelectorAll('[data-column]')].map(n=>[n.dataset.column,n.scrollTop]))
    const {root,selected,nodes,busy}=getData(),q=query().trim()
    viewport.replaceChildren();viewport.classList.add('folder-explorer')
    if(!root){viewport.append(el('p','폴더를 연결하면 상위·하위 폴더를 나란히 탐색할 수 있어요.','empty'));return}
    const current=nodes.get(selected)??root,chain=[]
    for(let n=current;n;n=nodes.get(n.parent))chain.unshift(n)
    const crumbs=el('nav',undefined,'folder-crumbs');crumbs.setAttribute('aria-label','현재 폴더 경로')
    for(const [i,node] of chain.entries()){
      if(i)crumbs.append(el('span','›'))
      const b=button(node.name,()=>select(node.id));b.disabled=busy;b.dataset.focusKey='crumb:'+node.id
      if(node.id===current.id)b.setAttribute('aria-current','location')
      crumbs.append(b)
    }
    viewport.append(crumbs)
    if(q){
      const results=el('div',undefined,'folder-search-results');results.setAttribute('aria-label','불러온 항목 검색 결과')
      let total=0,shown=0
      const add=(entry,parent,kind)=>{
        if(!matchesName(entry.name,q))return
        total++;if(shown>=RESULTS)return;shown++
        const row=button('',()=>pickResult({entry,parent,kind}));row.className='folder-result';row.disabled=busy
        row.dataset.focusKey='result:'+entry.id;row.append(el('span',kind==='directory'?'폴더':'파일','folder-kind'),el('strong',entry.name),el('small',parent.path))
        row.title='이 위치의 파일 목록 보기 · '+parent.path;results.append(row)
      }
      for(const node of nodes.values()){
        if(node.id!==root.id)add(node,nodes.get(node.parent)??root,'directory')
        for(const file of node.files)add(file,node,'file')
      }
      const summary=el('p',`불러온 이름에서 ${total}건 · 초성·띄어 쓴 낱말로 검색`,'folder-search-summary');summary.setAttribute('role','status');results.prepend(summary)
      if(!total)results.append(el('p','검색 결과가 없어요. 필요한 폴더를 먼저 열거나 검색어를 바꿔 주세요.','empty'))
      if(total>RESULTS)results.append(el('p',`앞의 ${RESULTS}건을 표시합니다. 검색어를 추가해 범위를 줄여 주세요.`,'empty'))
      viewport.append(results)
    }else{
      const columns=el('div',undefined,'folder-columns');columns.setAttribute('aria-label','가로 열 폴더 탐색')
      for(const node of chain){
        const col=el('section',undefined,'folder-column'),heading=el('h3',node.name);col.setAttribute('aria-label',node.name+' 하위 폴더')
        const list=el('div',undefined,'folder-column-list');list.dataset.column=node.id
        const folders=node.children.map(id=>nodes.get(id)).filter(Boolean),page=Math.min(pages.get(node.id)??0,Math.max(0,Math.ceil(folders.length/PAGE)-1))
        for(const child of folders.slice(page*PAGE,(page+1)*PAGE)){
          const b=button('',()=>select(child.id));b.className='column-folder';b.disabled=busy;b.title=child.path
          b.dataset.focusKey='column-folder:'+child.id;b.dataset.folder=child.id
          b.setAttribute('aria-pressed',String(chain.some(n=>n.id===child.id)))
          b.append(el('span','▱','folder-symbol'),el('span',child.name),el('span','›','folder-chevron'));decorateFolder?.(b,child);list.append(b)
        }
        if(node.error){list.append(el('p','폴더를 읽지 못했어요. '+node.error,'empty'));list.append(button('다시 읽기',()=>load(node.id,true)))}
        else if(!folders.length)list.append(el('p',node.loading||!node.loaded?'읽는 중…':'하위 폴더가 없어요.','empty'))
        const controls=el('div',undefined,'column-pages')
        if(page>0)controls.append(button('이전',()=>{pages.set(node.id,page-1);render()}))
        if((page+1)*PAGE<folders.length)controls.append(button('다음',()=>{pages.set(node.id,page+1);render()}))
        else if(!node.done&&!node.error){const more=button(node.loading?'읽는 중…':'더 읽기',()=>load(node.id));more.disabled=busy||!!node.loading;controls.append(more)}
        for(const b of controls.querySelectorAll('button'))b.disabled=busy||!!node.loading
        col.append(heading,list,el('p',`${folders.length}개 폴더 · ${node.files.length}개 파일${node.done?'':' · 일부만 읽음'}`,'column-count'),controls);columns.append(col)
      }
      viewport.append(columns)
      for(const list of columns.querySelectorAll('[data-column]'))list.scrollTop=scrolls.get(list.dataset.column)??0
      const path=chain.map(n=>n.id).join('/')
      columns.scrollLeft=lastPath!==path?columns.scrollWidth:lastLeft
      lastPath=path
    }
    if(active)[...viewport.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===active)?.focus({preventScroll:true})
  }
  viewport.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return
    const list=e.target.closest('.folder-column-list'),buttons=list&&[...list.querySelectorAll('.column-folder:not(:disabled)')]
    if(!buttons?.length)return
    const index=buttons.indexOf(document.activeElement);if(index<0)return
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)))
    buttons[next].focus()
  })
  return {render,reset(){pages.clear();lastPath='';lastLeft=0}}
}

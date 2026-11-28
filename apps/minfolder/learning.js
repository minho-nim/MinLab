// Exact filename families only: keep project names, meaningful numbers and extension.
// Dates and explicit revision suffixes may vary; arbitrary word similarity is not used.
export function filenameFamily(name){
  if(typeof name!=='string'||name.length>1024)return ''
  const dot=name.lastIndexOf('.');if(dot<=0)return ''
  const extension=name.slice(dot+1).toLowerCase();
  const stem=name.slice(0,dot).normalize('NFKC').toLowerCase()
    .replace(/(?:^|[ _.-])(?:20\d{2}[.-]?(?:0[1-9]|1[0-2])[.-]?(?:0[1-9]|[12]\d|3[01])|\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))(?=$|[ _.-])/gu,' ')
    .replace(/(?:[ _.-](?:v\d+|rev\d+|수정본|최종본?|복사본))+$/gu,'')
    .replace(/[^\p{L}\p{N}]/gu,'')
  return stem.length>=4&&extension?stem+'.'+extension:''
}
export function createLearning({storage=globalThis.localStorage,scope,onError=()=>{}}){
  const key='minfolder.learning.v1:'+scope
  let data={enabled:true,items:[]}
  try{const value=JSON.parse(storage.getItem(key));if(value&&typeof value.enabled==='boolean'&&Array.isArray(value.items))data={enabled:value.enabled,items:value.items.filter(x=>x&&typeof x.family==='string'&&Array.isArray(x.path)&&x.path.every(p=>typeof p==='string')&&typeof x.id==='string').slice(-200)}}catch{}
  function save(){try{storage.setItem(key,JSON.stringify(data))}catch{onError('추천 기록을 저장하지 못했어요. 이번 세션에서만 사용해요.')}}
  return {
    get enabled(){return data.enabled},get count(){return data.items.length},
    setEnabled(value){data.enabled=!!value;save()},clear(){data.items=[];save()},
    forget(id){data.items=data.items.filter(x=>x.id!==id);save()},
    learn(name,path,id){const family=filenameFamily(name);if(!data.enabled||!family||!Array.isArray(path))return;data.items=data.items.filter(x=>x.id!==id);data.items.push({family,path:[...path],id});data.items=data.items.slice(-200);save()},
    predict(name,folders){
      if(!data.enabled)return null
      const family=filenameFamily(name);if(!family)return null
      const matches=data.items.filter(x=>x.family===family)
      const choices=new Set(matches.map(x=>JSON.stringify(x.path)))
      if(choices.size!==1)return null
      const path=folders.find(p=>JSON.stringify(p)===[...choices][0]);
      return path?{path:[...path],reason:'이 폴더에서 승인한 같은 파일명 유형이에요. 위치를 확인해 주세요.'}:null
    }
  }
}

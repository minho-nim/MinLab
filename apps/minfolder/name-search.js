const initials=Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ')
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR')
export function initialName(value){
  return Array.from(normalize(value),char=>{
    const code=char.codePointAt(0)-0xac00
    return code>=0&&code<=11171?initials[Math.floor(code/588)]:char
  }).join('')
}
// Match every space-separated word. Initial-only words match Korean initials;
// literal words (including extensions and digits) keep their ordinary meaning.
export function matchesName(name,query){
  const text=normalize(name),initial=initialName(text)
  return normalize(query).trim().split(/\s+/u).filter(Boolean).every(word=>{
    const compat=word.normalize('NFC')
    const jamo=Array.from(compat,c=>{
      const index='ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ'.indexOf(c)
      return index<0?c:initials[index]
    }).join('')
    return /^[ㄱ-ㅎ]+$/u.test(jamo)?initial.includes(jamo):text.includes(word)
  })
}

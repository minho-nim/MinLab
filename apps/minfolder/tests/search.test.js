import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matchesName} from '../name-search.js'
test('계약명 초성과 확장자를 함께 검색',()=>{
  assert.equal(matchesName('강남케이블공사_작업절차서_최종.PDF','ㄱㄴ pdf'),true)
  assert.equal(matchesName('송도케이블공사_작업절차서.PDF','ㄱㄴ pdf'),false)
  assert.equal(matchesName('강남케이블공사_작업절차서.xlsx','ㄱㄴ pdf'),false)
})
test('문서 종류의 초성은 파일명 중간에도 일치',()=>{
  assert.equal(matchesName('강남케이블공사_작업절차서.docx','ㅈㅇㅈㅊㅅ'),true)
  assert.equal(matchesName('강남케이블공사_위험성평가.docx','ㅈㅇㅈㅊㅅ'),false)
})
test('띄어 쓴 단어는 순서와 무관하게 모두 일치해야 함',()=>{
  assert.equal(matchesName('송도_위험성평가_2026.xlsx','2026 송도 xlsx'),true)
  assert.equal(matchesName('송도_위험성평가_2026.xlsx','2026 강남'),false)
})
test('공백과 전각 영문·호환 자모를 정규화',()=>{
  assert.equal(matchesName('강남_ＡＢＣ.txt','  ㄱㄴ   abc '),true)
  assert.equal(matchesName('강남_ABC.txt','ᄀᄂ'),true)
  assert.equal(matchesName('아무파일.txt','   '),true)
})

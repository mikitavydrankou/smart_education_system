import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {sourceText,richCourseFixture} from '../material-fixture'

test('saved lesson, answers and generated audio work after an offline reload',async({page,context})=>{
 let speechRequests=0
 await page.route('**/api/material',route=>route.fulfill({json:{course:richCourseFixture}}))
 await page.route('**/api/speech',route=>{speechRequests++;return route.fulfill({contentType:'audio/mpeg',body:readFileSync('tests/fixtures/narration.mp3')})})
 await page.goto('/workspace')
 await expect(page.getByText('Gotowe do nauki offline',{exact:true})).toBeVisible({timeout:20000})
 await page.getByLabel('Materiał źródłowy',{exact:true}).fill(sourceText)
 await page.getByRole('button',{name:'Przygotuj moją lekcję'}).click()
 await page.getByRole('button',{name:'Zacznij naukę'}).click()
 await page.getByRole('button',{name:'Audio',exact:true}).click()
 await page.getByRole('button',{name:'Przygotuj nagranie'}).click()
 await expect(page.locator('audio')).toBeVisible()
 await expect(page.getByText('Nagranie zapisane na tym urządzeniu.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Sprawdź zrozumienie'}).click()
 await page.getByRole('radio').first().check()
 await context.setOffline(true)
 await page.reload()
 await expect(page.getByRole('radio').first()).toBeChecked()
 await expect(page.locator('audio')).toBeVisible()
 await page.locator('audio').evaluate((el:HTMLAudioElement)=>el.play())
 await page.getByRole('button',{name:'Sprawdź odpowiedź'}).click()
 await expect(page.getByText('Poprawna odpowiedź.',{exact:true})).toBeVisible()
 expect(speechRequests).toBe(1)
 await context.setOffline(false)
})

test('local library restores a closed lesson without generating again',async({page})=>{
 let generations=0
 await page.route('**/api/material',route=>{generations++;return route.fulfill({json:{course:richCourseFixture}})})
 await page.goto('/workspace')
 await page.getByLabel('Materiał źródłowy',{exact:true}).fill(sourceText)
 await page.getByRole('button',{name:'Przygotuj moją lekcję'}).click()
 await page.getByRole('button',{name:'Zacznij naukę'}).click()
 await expect(page.getByText('Lekcja zapisana w bibliotece urządzenia.',{exact:true})).toBeVisible()
 page.once('dialog',dialog=>dialog.accept())
 await page.getByRole('button',{name:'Nowy materiał',exact:true}).click()
 await page.getByRole('button',{name:/Otwórz lekcję: Jak rośliny/}).click()
 await expect(page.getByRole('button',{name:'Sprawdź zrozumienie'})).toBeVisible()
 expect(generations).toBe(1)
})

test('compact phone layout keeps local learning controls usable',async({page})=>{
 await page.setViewportSize({width:320,height:740})
 await page.route('**/api/material',route=>route.fulfill({json:{course:richCourseFixture}}))
 await page.goto('/workspace')
 await page.getByLabel('Materiał źródłowy',{exact:true}).fill(sourceText)
 await page.getByRole('button',{name:'Przygotuj moją lekcję'}).click()
 await page.getByRole('button',{name:'Zacznij naukę'}).click()
 await page.getByRole('button',{name:'Praktyka',exact:true}).click()
 await page.getByLabel('Pozycja: Dostarczenie światła',{exact:true}).selectOption('0')
 await page.getByRole('button',{name:'Sprawdź układ'}).click()
 await expect(page.getByText(/Poprawny układ/)).toBeVisible()
 const controls=page.locator('.order-controls button,.order-controls select')
 for(const control of await controls.all()){
  const box=await control.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44)
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth?Array.from(document.querySelectorAll('*')).filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).slice(-15):[])
 console.log('Overflow check',await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,client:document.documentElement.clientWidth,body:document.body.getBoundingClientRect().toJSON(),elements:Array.from(document.querySelectorAll('*')).filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>({tag:el.tagName,class:el.className,scroll:el.scrollWidth,client:el.clientWidth,right:el.getBoundingClientRect().right})).slice(-12)})),overflow)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

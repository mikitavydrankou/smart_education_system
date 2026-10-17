import {test} from 'node:test'
import assert from 'node:assert/strict'
import {courseQualityIssues,textCourseQualityIssues} from '../lib/course-quality.ts'
import {normalizeSource} from '../lib/material.ts'
import {courseFixture,richCourseFixture,sourceText} from './material-fixture.ts'
test('quality diagnostics identify exact structural failures instead of blaming the source',()=>{
 const course=structuredClone(richCourseFixture),source=normalizeSource(sourceText)!
 assert.deepEqual(courseQualityIssues(course,source),[])
 ;(course.concepts[0].media.activity.targets as {id:string;label:string}[]).push({id:'unused',label:'Unused distraction'})
 course.concepts[1].media.diagram.edges[0].to='missing'
 course.concepts[2].simple='x'
 const issues=courseQualityIssues(course,source).join('\n')
 assert.match(issues,/concepts\[0\].*targets/)
 assert.match(issues,/concepts\[1\].*edges/)
 assert.match(issues,/concepts\[2\].simple/)
})
test('text quality accepts text courses and flags duplicate question prompts',()=>{
 const source=normalizeSource(sourceText)!,course=structuredClone(courseFixture)
 assert.deepEqual(textCourseQualityIssues(course,source),[])
 course.concepts[0].retry.prompt=course.concepts[0].question.prompt
 assert.match(textCourseQualityIssues(course,source).join('\n'),/retry\.prompt/)
})
